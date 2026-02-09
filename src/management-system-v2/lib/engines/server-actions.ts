'use server';

import { UserFacingError, getErrorMessage, userError } from '../user-error';
import {
  DeployedProcessInfo,
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  getDeployment as fetchDeployment,
  getProcessImageFromMachine,
  removeDeploymentFromMachines,
} from './deployment';
import { Engine, SpaceEngine } from './machines';
import { savedEnginesToEngines } from './saved-engines-helpers';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { enableUseDB } from 'FeatureFlags';
import { getDbEngines, getDbEngineByAddress } from '@/lib/data/db/engines';
import { asyncFilter, asyncMap, asyncForEach } from '../helpers/javascriptHelpers';

import db from '@/lib/data/db';

import {
  activateUserTask,
  completeTasklistEntryOnMachine,
  getTaskListFromMachine,
  getUserTaskFileFromMachine,
  setTasklistEntryVariableValuesOnMachine,
  setTasklistEntryMilestoneValuesOnMachine,
  addOwnerToTaskListEntryOnMachine,
} from './tasklist';
import { truthyFilter } from '../typescript-utils';
import {
  inlineUserTaskData,
  getCorrectVariableState,
  getCorrectMilestoneState,
  inlineScript,
} from '@proceed/user-task-helper';
import { ExtendedTaskListEntry, UserTask } from '../user-task-schema';

import {
  addUserTasks,
  getUserTaskById,
  getUserTasks,
  updateUserTask,
  deleteUserTask,
} from '../data/user-tasks';
import { getFileFromMachine, submitFileToMachine, updateVariablesOnMachine } from './instances';
import { getProcessIds, getVariablesFromElementById } from '@proceed/bpmn-helper';
import { Variable } from '@proceed/bpmn-helper/src/getters';
import { getUsersInSpace } from '../data/db/iam/memberships';
import Ability from '../ability/abilityHelper';
import { getUserById } from '../data/db/iam/users';

export async function getCorrectTargetEngines(
  spaceId: string,
  onlyProceedEngines = false,
  validatorFunc?: (engine: Engine) => Promise<boolean>,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  let engines: Engine[] = [];
  if (onlyProceedEngines) {
    // force that only proceed engines are supposed to be used
    const proceedSavedEngines = await getDbEngines(null, undefined, 'dont-check');
    engines = await savedEnginesToEngines(proceedSavedEngines);
  } else {
    // use all available engines
    const [proceedEngines, spaceEngines] = await Promise.allSettled([
      getDbEngines(null, undefined, 'dont-check').then(savedEnginesToEngines),
      getDbEngines(spaceId, ability).then(savedEnginesToEngines),
    ]);

    if (proceedEngines.status === 'fulfilled') engines = proceedEngines.value;
    if (spaceEngines.status === 'fulfilled') engines = engines.concat(spaceEngines.value);
  }

  if (validatorFunc) engines = await asyncFilter(engines, validatorFunc);

  return engines;
}

export async function deployProcess(
  definitionId: string,
  versionId: string,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
  _forceEngine?: SpaceEngine | 'PROCEED',
) {
  try {
    // TODO: manage permissions for deploying a process

    if (!enableUseDB) throw new Error('deployProcess only available with enableUseDB');

    let engines;
    if (_forceEngine && _forceEngine !== 'PROCEED') {
      // forcing a specific engine
      const { ability } = await getCurrentEnvironment(spaceId);
      const address =
        _forceEngine.type === 'http' ? _forceEngine.address : _forceEngine.brokerAddress;
      const spaceEngine = await getDbEngineByAddress(address, spaceId, ability);
      if (!spaceEngine) throw new Error('No matching space engine found');
      engines = await savedEnginesToEngines([spaceEngine]);
      if (engines.length === 0) throw new Error("Engine couldn't be reached");
    } else {
      engines = await getCorrectTargetEngines(spaceId, _forceEngine === 'PROCEED');
    }

    if (engines.length === 0) throw new UserFacingError('No fitting engine found.');

    await _deployProcess(definitionId, versionId, spaceId, method, engines);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function removeDeployment(definitionId: string, spaceId: string) {
  try {
    if (!enableUseDB) throw new Error('removeDeployment only available with enableUseDB');

    const engines = await getCorrectTargetEngines(spaceId, false, async (engine: Engine) => {
      const deployments = await fetchDeployments([engine]);

      return deployments.some((deployment) => deployment.definitionId === definitionId);
    });

    await removeDeploymentFromMachines(engines, definitionId);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getAvailableTaskListEntries(spaceId: string, engines: Engine[]) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    let stored = await getUserTasks();

    if ('error' in stored) {
      throw stored.error;
    }

    const removedTasks = [] as string[];

    const fetched = (
      await asyncMap(engines, async (engine) => {
        try {
          const taskList = await getTaskListFromMachine(engine);

          // check if we have stored user tasks for this machine which have been removed from the
          // machine
          const removedFromMachine = Object.fromEntries(
            (stored as UserTask[])
              .filter((task) => task.machineId === engine.id)
              .map((task) => [task.id, task]),
          );
          taskList.forEach(
            (task) => delete removedFromMachine[`${task.id}|${task.instanceID}|${task.startTime}`],
          );
          removedTasks.push(...Object.keys(removedFromMachine));

          return taskList.map((task) => ({
            ...task,
            machineId: engine.id,
            potentialOwners: task.performers,
          }));
        } catch (e) {
          return null;
        }
      })
    )
      .filter(truthyFilter)
      .flat()
      .map(
        (task) =>
          ({
            ...task,
            id: `${task.id}|${task.instanceID}|${task.startTime}`,
            taskId: task.id,
            fileName: task.attrs['proceed:fileName'],
            milestones: undefined,
          }) as UserTask,
      );

    const newTasks: UserTask[] = [];
    const changedTasks: UserTask[] = [];

    fetched.forEach((task) => {
      const alreadyStored = (stored as UserTask[]).some((t) => t.id === task.id);
      if (alreadyStored) {
        // TODO: maybe check if the task actually changed
        changedTasks.push(task);
      } else {
        newTasks.push(task);
      }
    });

    if (newTasks.length) await addUserTasks(newTasks);
    await asyncForEach(changedTasks, async (task) => {
      delete task.milestones;
      await updateUserTask(task.id, task);
    });
    await asyncForEach(removedTasks, async (id) => {
      await deleteUserTask(id);
      stored = (stored as UserTask[]).filter((task) => task.id !== id);
    });

    const userTasks = [
      ...fetched,
      ...stored
        .filter((task) => !fetched.some((t) => t.id === task.id))
        .map(
          (task) =>
            ({
              ...task,
              startTime: +task.startTime,
              endTime: task.endTime && +task.endTime,
            }) as UserTask,
        ),
    ];

    return await asyncMap(userTasks, async (task) => {
      const actualOwner = await db.$transaction(async (tx) => {
        let users: {
          id: string;
          username?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        }[] = await asyncMap(task.actualOwner, async (owner) => {
          return getUserById(owner, undefined, tx) || owner;
        });

        return users.map((user) =>
          typeof user === 'string'
            ? { id: user, name: '' }
            : { id: user.id, name: user.firstName + ' ' + user.lastName, username: user?.username },
        );
      });

      return {
        ...task,
        actualOwner,
      } satisfies ExtendedTaskListEntry;
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getTasklistEntryHTML(
  spaceId: string,
  userTaskId: string,
  filename: string,
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    let {
      initialVariables,
      variableChanges,
      milestones,
      milestonesChanges,
      html,
      state: storedState,
    } = storedUserTask;

    if (engine && (!html || !milestones || !initialVariables)) {
      const [taskId, instanceId, startTimeString] = userTaskId.split('|');
      const [definitionId] = instanceId.split('-_');

      const startTime = parseInt(startTimeString);

      const userTasks = await getTaskListFromMachine(engine);
      const userTask = userTasks.find(
        (uT) => uT.instanceID === instanceId && uT.id === taskId && uT.startTime == startTime,
      );

      if (!userTask) throw new Error('Could not fetch user task data!');

      const deployment = await fetchDeployment(engine, definitionId);
      const instance = deployment.instances.find((i) => i.processInstanceId === instanceId);

      if (!instance)
        throw new Error(
          'Could not get instance information for the instance that started the user task',
        );

      const version = deployment.versions.find((v) => v.versionId === instance.processVersion)!;

      initialVariables = getCorrectVariableState(userTask, instance);
      milestones = await getCorrectMilestoneState(version.bpmn, userTask, instance);
      variableChanges = initialVariables;

      html = await getUserTaskFileFromMachine(engine, definitionId, filename);

      html = html.replace(/\/resources\/process[^"]*/g, (match) => {
        const path = match.split('/');
        return `/api/private/${spaceId}/engine/resources/process/${definitionId}/images/${path.pop()}`;
      });

      const processIds = await getProcessIds(version.bpmn);
      let variableDefinitions: undefined | Variable[];
      if (processIds.length) {
        const [processId] = processIds;
        variableDefinitions = await getVariablesFromElementById(version.bpmn, processId);
      }

      html = inlineScript(html, instanceId, taskId, variableDefinitions);

      if (storedState === 'READY') {
        await activateUserTask(engine, instanceId, taskId, startTime);
        storedState = 'ACTIVE';
      }

      updateUserTask(userTaskId, { html, initialVariables, milestones, state: storedState });
    } else {
      variableChanges = { ...initialVariables, ...(variableChanges || {}) };

      if (milestonesChanges) {
        milestones = (milestones || []).map((milestone) => ({
          ...milestone,
          value: milestonesChanges![milestone.id] ?? milestone.value,
        }));
      }
    }

    // maps relative urls used to get resources on the engine to the MS api to allow them to work here as well
    function mapResourceUrls(variables: Record<string, any>) {
      if (!variables) return variables;

      return Object.fromEntries(
        Object.entries(variables).map(([key, value]) => {
          const [_, instanceId] = userTaskId.split('|');
          const [definitionId] = instanceId.split('-_');

          if (
            typeof value === 'string' &&
            value.includes(`resources/process/${definitionId}/instance/${instanceId}/file/`)
          ) {
            return [key, `api/private/${spaceId}/engine/` + value];
          }

          return [key, value];
        }),
      );
    }

    if (!html) throw new Error('Failed to get the html for the user task');
    if (!milestones) throw new Error('Failed to get the milestones for the user task');

    return inlineUserTaskData(html, mapResourceUrls(variableChanges), milestones);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function addOwnerToTaskListEntry(
  userTaskId: string,
  owner: string,
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    let { actualOwner } = storedUserTask;

    if (!actualOwner.includes(owner)) {
      await updateUserTask(userTaskId, {
        actualOwner: [...actualOwner, owner],
      });

      if (engine) {
        const [taskId, instanceId] = userTaskId.split('|');

        return await addOwnerToTaskListEntryOnMachine(engine, instanceId, taskId, owner);
      }
    }

    return {};
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function setTasklistEntryVariableValues(
  userTaskId: string,
  variables: { [key: string]: any },
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    await updateUserTask(userTaskId, {
      variableChanges: { ...storedUserTask.variableChanges, ...variables },
    });

    if (engine) {
      const [taskId, instanceId] = userTaskId.split('|');

      await setTasklistEntryVariableValuesOnMachine(engine, instanceId, taskId, variables);
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function setTasklistMilestoneValues(
  userTaskId: string,
  milestones: { [key: string]: any },
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    await updateUserTask(userTaskId, {
      milestonesChanges: { ...storedUserTask.milestonesChanges, ...milestones },
    });

    if (engine) {
      const [taskId, instanceId] = userTaskId.split('|');

      await setTasklistEntryMilestoneValuesOnMachine(engine, instanceId, taskId, milestones);
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function completeTasklistEntry(
  userTaskId: string,
  variables: { [key: string]: any },
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    const { variableChanges, milestonesChanges } = storedUserTask;

    if (engine) {
      const [taskId, instanceId] = userTaskId.split('|');

      // push the values from the database to the engine so the instance state is correctly updated
      // when the user task is completed as the next step
      await setTasklistEntryVariableValuesOnMachine(
        engine,
        instanceId,
        taskId,
        variableChanges || {},
      );
      await setTasklistEntryMilestoneValuesOnMachine(
        engine,
        instanceId,
        taskId,
        milestonesChanges || {},
      );

      await completeTasklistEntryOnMachine(engine, instanceId, taskId, variables);
    }

    await updateUserTask(userTaskId, {
      variableChanges: { ...variableChanges, ...variables },
      state: 'COMPLETED',
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function updateVariables(
  spaceId: string,
  definitionId: string,
  instanceId: string,
  variables: Record<string, any>,
) {
  try {
    if (!enableUseDB) throw new Error('updateVariables only available with enableUseDB');

    // find the engine the instance is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      return deployments.some((deployment) =>
        deployment.instances.some((i) => i.processInstanceId === instanceId),
      );
    });

    await asyncForEach(
      engines,
      async (engine) => await updateVariablesOnMachine(definitionId, instanceId, engine, variables),
    );
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function submitFile(engine: Engine | null, userTaskId: string, formData: FormData) {
  try {
    const file = formData.get('file') as File;

    const fileName = file.name;
    const fileType = file.type;

    const [_, instanceId] = userTaskId.split('|');
    const [definitionId] = instanceId.split('-_');

    // TODO: implement file storing for user tasks in the MS to allow files to be stored for local
    // user tasks and also for user tasks that are cached in the MS
    if (!engine) throw new Error('Could not find the engine to submit the file to');

    const res = await submitFileToMachine(
      definitionId,
      instanceId,
      engine,
      fileName,
      fileType,
      Array.from(new Uint8Array(await file.arrayBuffer())),
    );

    return res;
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function getFile(
  spaceId: string,
  definitionId: string,
  instanceId: string,
  fileName: string,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  try {
    // find the engine the instance is running on
    let engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      return deployments.some((deployment) =>
        deployment.instances.some((i) => i.processInstanceId === instanceId),
      );
    });

    engines = ability ? ability.filter('view', 'Machine', engines) : engines;

    if (!engines.length) {
      throw new UserFacingError('Failed to find the engine the instance is running on!');
    }

    return await getFileFromMachine(definitionId, instanceId, fileName, engines[0]);
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

/** Returns space engines that are currently online */
export async function getAvailableSpaceEngines(spaceId: string) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableEnginesForSpace only available with enableUseDB');

    const { ability } = await getCurrentEnvironment(spaceId);
    const spaceEngines = await getDbEngines(spaceId, ability);
    return (await savedEnginesToEngines(spaceEngines)) as SpaceEngine[];
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getDeployment(spaceId: string, definitionId: string) {
  const engines = await getCorrectTargetEngines(spaceId);

  const deployments = await fetchDeployments(engines);

  return deployments.find((d) => d.definitionId === definitionId) || null;
}

export async function getProcessImage(spaceId: string, definitionId: string, fileName: string) {
  try {
    if (!enableUseDB) throw new Error('getProcessImage only available with enableUseDB');

    // find the engine the instance is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      // TODO: when we start to have assignments of processes to multiple machines we need to check
      // if the deployment on the machine actually contains the image
      return deployments.some((deployment) => deployment.definitionId === definitionId);
    });

    if (!engines.length) throw new Error('Failed to an engine the process was deployed to!');

    return await getProcessImageFromMachine(engines[0], definitionId, fileName);
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}
