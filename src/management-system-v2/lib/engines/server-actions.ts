'use server';

import {
  UserErrorType,
  UserFacingError,
  getErrorMessage,
  isUserErrorResponse,
  userError,
} from '../user-error';
import {
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  getDeployment as fetchDeployment,
  getProcessImageFromMachine,
  removeDeploymentFromMachines,
  changeDeploymentActivation as _changeDeploymentActivation,
  getDeploymentActivation,
} from './deployment';
import { Engine, SpaceEngine } from './machines';
import { savedEnginesToEngines } from './saved-engines-helpers';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { enableUseDB } from 'FeatureFlags';
import { getDbEngines, getDbEngineByAddress } from '@/lib/data/db/engines';
import { asyncFilter, asyncMap, asyncForEach, AsyncArray } from '../helpers/javascriptHelpers';

import db from '@/lib/data/db';

import {
  activateUserTask,
  completeTasklistEntryOnMachine,
  getTaskListFromMachine,
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
  getGlobalVariables,
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
import Ability from '../ability/abilityHelper';
import { getUserById } from '../data/db/iam/users';
import {
  addDeployment,
  getInstance as getStoredInstance,
  addInstance as storeInstanceData,
  updateInstance as updateStoredInstance,
  getDeployments as getStoredDeployments,
  updateDeployment,
  getProcessDeployments,
} from '../data/deployment';
import { engineRequest } from './endpoints';
import { getProcessBPMN, getProcessHtmlFormHTML } from '../data/processes';
import { getDataObject, isErrorResponse } from '@/app/api/spaces/[spaceId]/data/helper';
import { getInstanceFile, saveInstanceArtifact } from '../data/file-manager-facade';

export async function getCorrectTargetEngines(
  spaceId: string,
  onlyProceedEngines = false,
  validatorFunc?: (engine: Engine) => Promise<boolean>,
  ability?: Ability,
) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

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
  _forceEngine?: Engine | Engine[] | 'PROCEED',
) {
  try {
    // TODO: manage permissions for deploying a process

    if (!enableUseDB) throw new Error('deployProcess only available with enableUseDB');

    const { userId } = await getCurrentUser();

    let engines: Engine[];
    if (_forceEngine && _forceEngine !== 'PROCEED') {
      // forcing a specific engine
      const { ability } = await getCurrentEnvironment(spaceId);

      async function resolveEngines(engines: Engine[]) {
        const addresses = engines.map((engine) =>
          engine.type === 'http' ? engine.address : engine.brokerAddress,
        );
        const spaceEngines = await db.$transaction(async () => {
          return await asyncMap(addresses, async (address) =>
            getDbEngineByAddress(address, spaceId, ability),
          );
        });
        if (spaceEngines.some((spaceEngine) => !spaceEngine)) {
          throw new Error('No matching space engine found');
        }
        return savedEnginesToEngines(spaceEngines as NonNullable<(typeof spaceEngines)[number]>[]);
      }

      if (Array.isArray(_forceEngine)) {
        engines = await resolveEngines(_forceEngine);
        if (engines.length === 0) throw new Error('Could not reach any engine.');
      } else {
        engines = await resolveEngines([_forceEngine]);
        if (engines.length === 0) throw new Error("Engine couldn't be reached");
      }
    } else {
      engines = await getCorrectTargetEngines(spaceId, _forceEngine === 'PROCEED');
    }

    if (engines.length === 0) throw new UserFacingError('No fitting engine found.');

    const alreadyDeployed = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(alreadyDeployed)) return alreadyDeployed;

    // find all currently available deployments
    const processAlreadyDeployedInfo = alreadyDeployed
      .map((deployment) => ({
        ...deployment,
        machines: deployment.machineIds
          .map((id) => engines.find((e) => e.id === id))
          .filter(truthyFilter),
      }))
      .filter((d) => !!d.machines.length);

    // check if the version is already deployed to some reachable engine since we don't
    // need to redeploy it in that case
    if (processAlreadyDeployedInfo.some((i) => i.versionId === versionId)) {
      return;
    }

    if (processAlreadyDeployedInfo.length) {
      // check if an engine already has another version in which case that engine is selected
      engines = processAlreadyDeployedInfo.flatMap((i) => i.machines);
    }

    const deployedTo = await _deployProcess(definitionId, versionId, spaceId, method, engines);

    await addDeployment(spaceId, {
      versionId,
      machineIds: deployedTo.map((engine) => engine.id),
      deployerId: userId,
      deployTime: new Date(),
    });

    // deactivate the process on all engines that have a deployment but which were not target of the
    // new deployment
    await Promise.allSettled(
      processAlreadyDeployedInfo
        .flatMap((i) => i.machines)
        .map(async (engine) => {
          if (!deployedTo.some((dE) => dE.id === engine.id)) {
            await _changeDeploymentActivation(engine, definitionId, undefined, false);
          }
        }),
    );
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function removeDeployment(definitionId: string, spaceId: string) {
  try {
    if (!enableUseDB) throw new Error('removeDeployment only available with enableUseDB');

    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('manage', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);

    const deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;

    const engines = await getCorrectTargetEngines(spaceId, false);

    await asyncForEach(deployments, async (deployment) => {
      const stillDeployedOn = await asyncMap(deployment.machineIds, async (machineId) => {
        try {
          // check if the engine is currently reachable if not we have to remove the deployment at
          // a future time when it becomes reachable again
          const machine = engines.find((engine) => engine.id === machineId);
          if (!machine) return machineId;

          // remove the deployment from the engine
          // this will also affect other deployments of the same process but since this function
          // is aimed at removing all deployments of the process, this should not be a problem
          await removeDeploymentFromMachines([machine], deployment.processId);
        } catch (err) {
          // could not remove the deployment so we keep the machine as still having the
          // deployment
          return machineId;
        }
      }).nonNullable();

      await updateDeployment(spaceId, deployment.id, {
        deleted: !stillDeployedOn.length || deployment.deleted,
        machineIds: stillDeployedOn,
      });
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function changeDeploymentActivation(
  definitionId: string,
  spaceId: string,
  version: string,
  value: boolean,
) {
  try {
    const engines = await getCorrectTargetEngines(spaceId, false);

    const versionDeploymentsResult = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(versionDeploymentsResult)) return versionDeploymentsResult;

    // TODO: what do we do if some engines are not reachable/if changing the activation fails?
    await Promise.allSettled(
      versionDeploymentsResult
        .filter((d) => d.versionId === version)
        .flatMap((d) => d.machineIds)
        .map((machineId) => {
          const engine = engines.find((e) => e.id === machineId);
          if (engine) _changeDeploymentActivation(engine, definitionId, version, value);
        }),
    );
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getProcessActivationStatus(
  definitionId: string,
  spaceId: string,
  version: string,
) {
  try {
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine: Engine) => {
      const deployments = await fetchDeployments([engine]);
      return deployments.some(
        (deployment) =>
          deployment.definitionId === definitionId &&
          deployment.versions.some((v) => v.versionId === version),
      );
    });

    if (!engines.length) return false;

    return await getDeploymentActivation(engines[0], definitionId, version);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

async function isReachable(engine: Engine) {
  try {
    await engineRequest({ engine, method: 'get', endpoint: '/status/' });
    return true;
  } catch (err) {
    return false;
  }
}

export async function getAvailableTaskListEntries(spaceId: string, engines: Engine[]) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    let stored = await getUserTasks();

    if (isUserErrorResponse(stored)) return stored;

    const deployments = await getStoredDeployments(spaceId, true);

    if (isUserErrorResponse(deployments)) return deployments;

    const knownInstances = deployments.flatMap((d) => d.instances).map((i) => i.id);

    const removedTasks = [] as string[];
    const newTasks: UserTask[] = [];
    const changedTasks: UserTask[] = [];

    const fetched = await asyncMap(deployments, (d) => {
      return d.machineIds;
    })
      .flatten()
      .deduplicate((id) => id)
      .map(async (id) => {
        const engine = engines.find((e) => e.id === id);

        if (engine && !(await isReachable(engine))) {
          return;
        }

        return engine;
      })
      .nonNullable()
      .map(async (engine) => {
        try {
          let taskList = await getTaskListFromMachine(engine);

          taskList = taskList.filter((t) => knownInstances.includes(t.instanceID));

          // check if we have stored user tasks for this machine which have been removed from the
          // machine
          const removedFromMachine = Object.fromEntries(
            (stored as UserTask[])
              .filter((task) => task.machineId === engine.id)
              .map((task) => [task.id, true]),
          );
          taskList.forEach(
            (task) => delete removedFromMachine[`${task.id}|${task.instanceID}|${task.startTime}`],
          );
          removedTasks.push(...Object.keys(removedFromMachine));

          return taskList.map(
            (task) =>
              ({
                ...task,
                id: `${task.id}|${task.instanceID}|${task.startTime}`,
                taskId: task.id,
                fileName: task.attrs['proceed:fileName'],
                milestones: undefined,
                machineId: engine.id,
                potentialOwners: task.performers,
              }) satisfies UserTask,
          );
        } catch (e) {
          return null;
        }
      })
      .nonNullable()
      .flatten()
      .forEach((task) => {
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
        }[] = (
          await asyncMap(task.actualOwner, async (owner) => {
            return getUserById(owner, undefined, tx) || owner;
          })
        ).filter(truthyFilter);

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

export async function getGlobalVariablesForHTML(
  spaceId: string,
  initiatorId: string,
  html: string,
) {
  return await getGlobalVariables(html, async (varPath) => {
    let segments = varPath.split('.');

    let userId: string | undefined;

    if (segments[0] === '@process-initiator') {
      userId = initiatorId;
    } else if (segments[0] === '@worker' || !segments[0].startsWith('@')) {
      ({ userId } = await getCurrentUser());
    } else if (segments[0] !== '@organization') {
      throw new UserFacingError(
        `Invalid selector for global data access in user task html. (${segments[0]})`,
      );
    }

    if (segments[0].startsWith('@')) segments = segments.slice(1);

    const result = await getDataObject(spaceId, segments.join('.'), userId);

    if (isErrorResponse(result)) {
      throw new UserFacingError(await result.data.text());
    }

    return result.data?.value;
  });
}

export async function getTasklistEntryHTML(
  spaceId: string,
  userTaskId: string,
  filename: string,
  engine?: Engine | null,
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

      const deployments = await getDeployments(spaceId, [engine]);

      if (isUserErrorResponse(deployments)) return deployments;

      const instance = deployments
        .filter((d) => d.processId === definitionId)
        .flatMap((d) => d.instances)
        .find((i) => i.id === instanceId);

      if (!instance)
        throw new Error(
          'Could not get instance information for the instance that started the user task',
        );

      const bpmn = await getProcessBPMN(definitionId, spaceId, instance.versionId);

      if (isUserErrorResponse(bpmn)) return bpmn;

      initialVariables = getCorrectVariableState(userTask, instance.state);
      milestones = await getCorrectMilestoneState(bpmn, userTask, instance.state);
      variableChanges = initialVariables;

      const htmlForm = await getProcessHtmlFormHTML(definitionId, filename, spaceId);

      if (isUserErrorResponse(htmlForm)) return htmlForm;

      html = htmlForm.replace(/\/resources\/process[^"]*/g, (match) => {
        const path = match.split('/');
        return `/api/private/${spaceId}/engine/resources/process/${instanceId}/images/${path.pop()}`;
      });

      const processIds = await getProcessIds(bpmn);
      let variableDefinitions: undefined | Variable[];
      if (processIds.length) {
        const [processId] = processIds;
        variableDefinitions = await getVariablesFromElementById(bpmn, processId);
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

    let globalVars: Record<string, any> = {};

    if (storedUserTask.instanceID) {
      const instance = await getStoredInstance(spaceId, storedUserTask.instanceID);
      if (isUserErrorResponse(instance)) return instance;
      if (!instance) throw new Error('Cannot retrieve the instance initiator information.');
      if (!instance.initiatorId) throw new Error('Missing initiator information');

      globalVars = await getGlobalVariablesForHTML(spaceId, instance.initiatorId, html);
    }

    variableChanges = { ...variableChanges, ...globalVars };

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

    const instance = await getStoredInstance(spaceId, instanceId);

    if (isUserErrorResponse(instance)) return instance;

    if (!instance) return userError('Could not find the instance to change.');

    // find the engine the instance is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      return instance.machineIds.includes(engine.id);
    });

    if (!engines.length) return userError('Could not reach the engines the instance is running on');

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

  const instance = await getStoredInstance(spaceId, instanceId);

  if (isUserErrorResponse(instance)) return instance;

  const savedFile = await getInstanceFile(instanceId, fileName);
  if (savedFile) {
    return savedFile;
  }

  try {
    // find the engine the instance is running on
    let engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      return instance.machineIds.includes(engine.id);
    });

    engines = ability ? ability.filter('view', 'Machine', engines) : engines;

    if (!engines.length) {
      throw new UserFacingError('Failed to find the engine the instance is running on!');
    }

    const file = await getFileFromMachine(definitionId, instanceId, fileName, engines[0]);

    try {
      const res = await saveInstanceArtifact(
        spaceId,
        instanceId,
        fileName,
        file.type,
        Buffer.from(await file.arrayBuffer()),
      );

      if (res.presignedUrl) {
        // TODO: handle cloud storage case
      }
    } catch (err) {
      console.error(`Failed to cache instance file ${fileName}.`);
    }

    return file;
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

export async function getDeployments(spaceId: string, engines?: Engine[]) {
  const deployments = await getStoredDeployments(spaceId);
  if (isUserErrorResponse(deployments)) return deployments;

  if (!engines) engines = await getCorrectTargetEngines(spaceId, false);

  // check which engines are actually reachable at the moment
  let reachableEngines = await asyncFilter(engines || [], isReachable);

  const updatedDeployments = await asyncMap(deployments, async (deployment) => {
    let { machineIds } = deployment;

    // update the list of machines on which we expect the deployment to exist
    const machines = await AsyncArray.from(machineIds)
      // if a machine is reachable we fetch the newest information otherwise we assume that nothing
      // changed until we can reach the machine again
      .map((id) => reachableEngines.find((e) => e.id === id) || id)
      .filter(async (machine) => {
        if (typeof machine !== 'string') {
          if (deployment.deleted) {
            try {
              // remove the deployment from the machine and remove the machine from the
              // machine list
              await removeDeploymentFromMachines([machine], deployment.processId);
              return false;
            } catch (err) {}
          } else {
            try {
              await fetchDeployment(machine, deployment.processId, 'definitionId');
            } catch (err) {
              // remove the machine from the machine list if the deployment has been removed for
              // some reason
              return false;
            }
          }
        }
        return true;
      });

    // TODO: handle that instances can be forwaded automatically which might change the list of
    // machines the deployment can be found on
    const fetchedInstances = await asyncMap(machines, async (machine) => {
      if (typeof machine !== 'string') {
        try {
          // try to get the newest information for all instances of the deployment
          const updatedInstances = await fetchDeployment(
            machine,
            deployment.processId,
            'instances',
          );

          return updatedInstances.instances
            .filter(({ processVersion }) => processVersion === deployment.versionId)
            .map((instance) => ({ instance, machine }));
        } catch (err) {}
      }

      return [];
    }).flatten();

    let knownInstances = Object.fromEntries(
      deployment.instances.map((i) => {
        const filteredMachines = i.machineIds.filter(
          (id) => !reachableEngines.some((e) => e.id === id),
        );

        return [i.id, { data: { ...i, machineIds: filteredMachines }, changed: false }];
      }),
    );

    // update/extend the known instance information
    const updatedInstancesMap = fetchedInstances.reduce((map, curr) => {
      const id = curr.instance.processInstanceId;
      if (id in map) {
        const known = map[id];
        if (!known.data.machineIds.includes(curr.machine.id)) {
          known.data.machineIds.push(curr.machine.id);
          // TODO: merge the instance state
          known.data.state = curr.instance;
          known.changed = true;
        }
      } else {
        map[id] = {
          data: {
            id,
            versionId: curr.instance.processVersion,
            deploymentId: deployment.id,
            machineIds: [curr.machine.id],
            state: curr.instance,
            initiatorId: null,
          },
          changed: true,
        };
      }

      return map;
    }, knownInstances);

    const updatedInstances = Object.values(updatedInstancesMap);

    // push instance changes to the database
    asyncForEach(updatedInstances, async (instance) => {
      if (instance.changed) {
        if (!knownInstances[instance.data.id]) {
          await storeInstanceData(spaceId, instance as any);
        } else {
          await updateStoredInstance(spaceId, instance.data.id, {
            state: instance.data.state as any,
          });
        }
      }
    });

    return {
      ...deployment,
      deleted: !machines.length || deployment.deleted,
      instances: updatedInstances.map((u) => u.data),
      machineIds: machines.map((m) => (typeof m === 'string' ? m : m.id)),
    };
  }).forEach(async (uD) => {
    const storedDeployment = deployments.find((sD) => sD.id === uD.id)!;

    // updated deleted status and machine information for deployments with changes
    if (
      (uD.deleted && !storedDeployment.deleted) ||
      uD.machineIds.length !== storedDeployment.machineIds.length ||
      !uD.machineIds.every((id, index) => id === storedDeployment.machineIds[index])
    ) {
      await updateDeployment(spaceId, uD.id, {
        deleted: uD.deleted,
        machineIds: uD.machineIds,
      });
    }
  });

  return updatedDeployments;
}
