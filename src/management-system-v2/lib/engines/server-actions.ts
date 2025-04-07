'use server';

import { UserFacingError, getErrorMessage, userError } from '../user-error';
import {
  DeployedProcessInfo,
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  removeDeploymentFromMachines,
} from './deployment';
import {
  Engine,
  SpaceEngine,
  getProceedEngines as _getEngines,
  getProceedEngines,
} from './machines';
import { spaceEnginesToEngines } from './space-engines-helpers';
import { getCurrentEnvironment } from '@/components/auth';
import { enableUseDB } from 'FeatureFlags';
import {
  getSpaceEngines as getSpaceEnginesFromDb,
  getSpaceEngineByAddress as getSpaceEngineByAddressFromDb,
} from '@/lib/data/db/space-engines';

import { startInstanceOnMachine } from './instances';
import { asyncFilter, asyncForEach, asyncMap } from '../helpers/javascriptHelpers';
import {
  activateUserTask,
  completeTasklistEntryOnMachine,
  getTaskListFromMachine,
  getUserTaskFileFromMachine,
  setTasklistEntryMilestoneValuesOnMachine,
  setTasklistEntryVariableValuesOnMachine,
} from './tasklist';
import { truthyFilter } from '../typescript-utils';

import {
  inlineUserTaskData,
  getCorrectVariableState,
  getCorrectMilestoneState,
} from '@proceed/user-task-helper';
import { UserTask } from '../user-task-schema';
import {
  addUserTasks,
  getUserTaskById,
  getUserTasks,
  updateUserTask,
  deleteUserTask,
} from '../data/user-tasks';

async function getCorrectTargetEngines(
  spaceId: string,
  onlyProceedEngines = false,
  validatorFunc?: (engine: Engine) => Promise<boolean>,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  let engines: Engine[] = [];
  if (onlyProceedEngines) {
    // force that only proceed engines are supposed to be used
    engines = await getProceedEngines();
  } else {
    // use all available engines
    const [proceedEngines, spaceEngines] = await Promise.allSettled([
      getProceedEngines(),
      getSpaceEnginesFromDb(spaceId, ability),
    ]);

    if (proceedEngines.status === 'fulfilled') engines = proceedEngines.value;

    if (spaceEngines.status === 'fulfilled') {
      let availableSpaceEngines = await spaceEnginesToEngines(spaceEngines.value);
      engines = engines.concat(availableSpaceEngines);
    }
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
      const spaceEngine = await getSpaceEngineByAddressFromDb(address, spaceId, ability);
      if (!spaceEngine) throw new Error('No matching space engine found');
      engines = await spaceEnginesToEngines([spaceEngine]);
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

export async function startInstance(
  definitionId: string,
  versionId: string,
  spaceId: string,
  variables: { [key: string]: any } = {},
) {
  try {
    // TODO: manage permissions for starting an instance

    if (!enableUseDB) throw new Error('startInstance is only available with enableUseDB');

    const engines = await getCorrectTargetEngines(spaceId, false, async (engine: Engine) => {
      const deployments = await fetchDeployments([engine]);

      // TODO: in case of static deployment we will need to only return the engines that are
      // assigned an entry point of the process
      return deployments.some(
        (deployment) =>
          deployment.definitionId === definitionId &&
          deployment.versions.some((version) => version.versionId === versionId),
      );
    });

    if (engines.length === 0)
      return userError('Could not find an engine that the selected process could be started on.');

    // TODO: if there are multiple possible engines maybe try to find the one that fits the best
    // (e.g. the one with the least load)
    return await startInstanceOnMachine(definitionId, versionId, engines[0], variables);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getAvailableTaskListEntries(spaceId: string) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const engines = await getCorrectTargetEngines(spaceId);

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

          return taskList.map((task) => ({ ...task, machineId: engine.id }));
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

    const [newTasks, changedTasks] = fetched.reduce(
      (acc, task) => {
        if ((stored as UserTask[]).some((t) => t.id === task.id)) {
          // TODO: maybe check if the task actually changed
          return [acc[0], [...acc[1], task]];
        } else {
          return [[...acc[0], task], acc[1]];
        }
      },
      [[], []] as [UserTask[], UserTask[]],
    );

    if (newTasks.length) await addUserTasks(newTasks);
    await asyncForEach(changedTasks, async (task) => {
      delete task.milestones;
      await updateUserTask(task.id, task);
    });
    await asyncForEach(removedTasks, async (id) => {
      await deleteUserTask(id);
      stored = (stored as UserTask[]).filter((task) => task.id !== id);
    });

    return [
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
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getTasklistEntryHTML(spaceId: string, userTaskId: string, filename: string) {
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
    const [taskId, instanceId, startTimeString] = userTaskId.split('|');

    if (!html || !milestones || !initialVariables) {
      const startTime = parseInt(startTimeString);

      const definitionId = instanceId.split('-_')[0];

      let engines = await getCorrectTargetEngines(spaceId);
      let deployments = await asyncMap(engines, async (engine) => {
        return [engine, await fetchDeployments([engine])] as [Engine, DeployedProcessInfo[]];
      });
      deployments = deployments.filter(([_, ds]) => {
        if (!ds) return false;

        return ds.some((d) => {
          const instance = d.instances.find((i) => i.processInstanceId === instanceId);

          if (!instance) return false;

          const userTaskIsCurrentlyRunning = instance.tokens.some(
            (token) =>
              token.currentFlowElementId === taskId &&
              token.currentFlowElementStartTime === startTime,
          );

          const userTaskWasCompleted = instance.log.some(
            (entry) => entry.flowElementId === taskId && entry.startTime === startTime,
          );

          return userTaskIsCurrentlyRunning || userTaskWasCompleted;
        });
      });

      if (!deployments.length)
        throw new Error('Failed to find the engine the user task is running on!');

      const deployment = deployments[0][1].find((d) => d.definitionId === definitionId)!;
      const instance = deployment.instances.find((i) => i.processInstanceId === instanceId)!;
      const version = deployment.versions.find((v) => v.versionId === instance.processVersion)!;
      const userTasks = await getTaskListFromMachine(deployments[0][0]);
      const userTask = userTasks.find(
        (uT) => uT.instanceID === instanceId && uT.id === taskId && uT.startTime == startTime,
      );

      if (!userTask) throw new Error('Could not fetch user task data!');

      initialVariables = getCorrectVariableState(userTask, instance);
      milestones = await getCorrectMilestoneState(version.bpmn, userTask, instance);
      variableChanges = initialVariables;

      html = await getUserTaskFileFromMachine(deployments[0][0], definitionId, filename);

      if (storedState === 'READY') {
        await activateUserTask(deployments[0][0], instanceId, taskId, startTime);
        storedState = 'ACTIVE';
      }

      updateUserTask(userTaskId, { html, initialVariables, milestones, state: storedState });
    } else {
      variableChanges = { ...(initialVariables || {}), ...(variableChanges || {}) };

      if (milestonesChanges) {
        milestones = milestones.map((milestone) => ({
          ...milestone,
          value: milestonesChanges[milestone.id] ?? milestone.value,
        }));
      }
    }

    return inlineUserTaskData(html, instanceId, taskId, variableChanges, milestones);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function setTasklistEntryVariableValues(
  spaceId: string,
  userTaskId: string,
  variables: { [key: string]: any },
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    const [taskId, instanceId] = userTaskId.split('|');

    await updateUserTask(userTaskId, {
      variableChanges: { ...storedUserTask.variableChanges, ...variables },
    });

    // find the engine the user task is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      const instance = deployments
        .find((deployment) => deployment.instances.some((i) => i.processInstanceId === instanceId))
        ?.instances.find((i) => i.processInstanceId === instanceId);

      if (!instance) return false;

      return instance.tokens.some((token) => token.currentFlowElementId === taskId);
    });

    if (engines.length) {
      await setTasklistEntryVariableValuesOnMachine(engines[0], instanceId, taskId, variables);
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function setTasklistMilestoneValues(
  spaceId: string,
  userTaskId: string,
  milestones: { [key: string]: any },
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    const [taskId, instanceId] = userTaskId.split('|');

    await updateUserTask(userTaskId, {
      milestonesChanges: { ...storedUserTask.milestonesChanges, ...milestones },
    });

    // find the engine the user task is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      const instance = deployments
        .find((deployment) => deployment.instances.some((i) => i.processInstanceId === instanceId))
        ?.instances.find((i) => i.processInstanceId === instanceId);

      if (!instance) return false;

      return instance.tokens.some((token) => token.currentFlowElementId === taskId);
    });

    if (engines.length) {
      await setTasklistEntryMilestoneValuesOnMachine(engines[0], instanceId, taskId, milestones);
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function completeTasklistEntry(
  spaceId: string,
  userTaskId: string,
  variables: { [key: string]: any },
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const [taskId, instanceId] = userTaskId.split('|');

    // find the engine the user task is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      const instance = deployments
        .find((deployment) => deployment.instances.some((i) => i.processInstanceId === instanceId))
        ?.instances.find((i) => i.processInstanceId === instanceId);

      if (!instance) return false;

      return instance.tokens.some((token) => token.currentFlowElementId === taskId);
    });

    if (!engines.length) throw new Error('Failed to find the engine the user task is running on!');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    const { variableChanges, milestonesChanges } = storedUserTask;

    await setTasklistEntryVariableValuesOnMachine(
      engines[0],
      instanceId,
      taskId,
      variableChanges || {},
    );
    await setTasklistEntryMilestoneValuesOnMachine(
      engines[0],
      instanceId,
      taskId,
      milestonesChanges || {},
    );
    await completeTasklistEntryOnMachine(engines[0], instanceId, taskId, variables);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

/** Returns space engines that are currently online */
export async function getAvailableSpaceEngines(spaceId: string) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableEnginesForSpace only available with enableUseDB');

    const { ability } = await getCurrentEnvironment(spaceId);
    const spaceEngines = await getSpaceEnginesFromDb(spaceId, ability);
    return await spaceEnginesToEngines(spaceEngines);
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
