'use server';

import { getCurrentUser } from '@/components/auth';
import { getGlobalVariables, inlineUserTaskData } from '@proceed/user-task-helper';
import { UserFacingError, getErrorMessage, isUserErrorResponse, userError } from '../user-error';
import { getDataObject, isErrorResponse } from '@/app/api/spaces/[spaceId]/data/helper';
import { getUserTaskById, updateUserTask } from '../data/user-tasks';
import { getMachineIfAvailable } from '../data/engines';
import {
  activateUserTask,
  addOwnerToTaskListEntryOnMachine,
  completeTasklistEntryOnMachine,
  setTasklistEntryMilestoneValuesOnMachine,
  setTasklistEntryVariableValuesOnMachine,
} from '../engines/tasklist';
import { getInstance as getStoredInstance } from '../data/instance';
import { submitFileToMachine } from '../engines/instances';
import { saveInstanceArtifact } from '../data/file-manager-facade';

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

export async function getTasklistEntryHTML(spaceId: string, userTaskId: string) {
  try {
    const storedUserTask = await getUserTaskById(spaceId, userTaskId);

    if (!storedUserTask || isUserErrorResponse(storedUserTask)) {
      throw new Error('Failed to get stored user task data.');
    }

    let { initialVariables, variableChanges, milestones, milestonesChanges, html } = storedUserTask;

    if (storedUserTask.state === 'READY') {
      let activated = true;
      if (storedUserTask.instanceID && storedUserTask.machineId) {
        try {
          const engine = await getMachineIfAvailable(spaceId, storedUserTask.machineId);
          if (engine) {
            await activateUserTask(
              engine,
              storedUserTask.instanceID,
              storedUserTask.taskId,
              storedUserTask.startTime.getTime(),
            );
          } else {
            activated = false;
          }
        } catch (err) {
          activated = false;
        }
      }

      if (activated) await updateUserTask(spaceId, userTaskId, { state: 'ACTIVE' });
    }

    variableChanges = { ...initialVariables, ...(variableChanges || {}) };

    if (milestonesChanges) {
      milestones = (milestones || []).map((milestone) => ({
        ...milestone,
        value: milestonesChanges![milestone.id] ?? milestone.value,
      }));
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

    let globalVars: Record<string, any> = {};

    if (storedUserTask.instanceID) {
      const instance = await getStoredInstance(spaceId, storedUserTask.instanceID);
      if (isUserErrorResponse(instance)) return instance;
      if (!instance) throw new Error('Cannot retrieve the instance initiator information.');
      if (!instance.initiatorId) throw new Error('Missing initiator information');

      globalVars = await getGlobalVariablesForHTML(spaceId, instance.initiatorId, html);

      variableChanges = mapResourceUrls(variableChanges);
    }

    variableChanges = { ...variableChanges, ...globalVars };

    return inlineUserTaskData(html, variableChanges, milestones);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function addOwnerToTaskListEntry(
  spaceId: string,
  userTaskId: string,
  ownerId: string,
) {
  try {
    const storedUserTask = await getUserTaskById(spaceId, userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    let { actualOwner } = storedUserTask;

    if (!actualOwner.some((owner) => owner.id === ownerId)) {
      await updateUserTask(spaceId, userTaskId, {
        actualOwner: [...actualOwner.map((aO) => aO.id), ownerId],
      });

      if (storedUserTask.instanceID) {
        const { machineId } = storedUserTask;
        const engine = machineId && (await getMachineIfAvailable(spaceId, machineId));

        if (!engine) {
          return userError('Could not find the engine this user task is running on.');
        }

        const [taskId, instanceId] = userTaskId.split('|');

        return await addOwnerToTaskListEntryOnMachine(engine, instanceId, taskId, ownerId);
      }
    }

    return {};
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
    const storedUserTask = await getUserTaskById(spaceId, userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    await updateUserTask(spaceId, userTaskId, {
      variableChanges: { ...storedUserTask.variableChanges, ...variables },
    });

    if (storedUserTask.instanceID) {
      const { machineId } = storedUserTask;
      const engine = machineId && (await getMachineIfAvailable(spaceId, machineId));

      if (!engine) {
        return userError('Could not find the engine this user task is running on.');
      }

      const [taskId, instanceId] = userTaskId.split('|');

      await setTasklistEntryVariableValuesOnMachine(engine, instanceId, taskId, variables);
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function submitFile(spaceId: string, userTaskId: string, formData: FormData) {
  try {
    const storedUserTask = await getUserTaskById(spaceId, userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    if (!storedUserTask.instanceID) {
      return userError('We cannot save files for locally created user tasks');
    }

    const { machineId } = storedUserTask;
    const engine = machineId && (await getMachineIfAvailable(spaceId, machineId));

    if (!engine) {
      return userError('Could not find the engine this user task is running on.');
    }

    const file = formData.get('file') as File;

    const fileName = file.name;
    const fileType = file.type;

    const [_, instanceId] = userTaskId.split('|');
    const [definitionId] = instanceId.split('-_');

    if (!engine) throw new Error('Could not find the engine to submit the file to');

    const res = await submitFileToMachine(
      definitionId,
      instanceId,
      engine,
      fileName,
      fileType,
      Array.from(new Uint8Array(await file.arrayBuffer())),
    );

    await saveInstanceArtifact(
      spaceId,
      instanceId,
      fileName,
      file.type,
      Buffer.from(await file.arrayBuffer()),
    );

    return res;
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function setTasklistMilestoneValues(
  spaceId: string,
  userTaskId: string,
  milestones: { [key: string]: any },
) {
  try {
    const storedUserTask = await getUserTaskById(spaceId, userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    await updateUserTask(spaceId, userTaskId, {
      milestonesChanges: { ...storedUserTask.milestonesChanges, ...milestones },
    });

    if (storedUserTask.instanceID) {
      const { machineId } = storedUserTask;
      const engine = machineId && (await getMachineIfAvailable(spaceId, machineId));

      if (!engine) {
        return userError('Could not find the engine this user task is running on.');
      }

      const [taskId, instanceId] = userTaskId.split('|');

      await setTasklistEntryMilestoneValuesOnMachine(engine, instanceId, taskId, milestones);
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
    const storedUserTask = await getUserTaskById(spaceId, userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    const { variableChanges, milestonesChanges } = storedUserTask;

    if (storedUserTask.instanceID) {
      const { machineId } = storedUserTask;
      const engine = machineId && (await getMachineIfAvailable(spaceId, machineId));

      if (!engine) {
        return userError('Could not find the engine this user task is running on.');
      }

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

    await updateUserTask(spaceId, userTaskId, {
      variableChanges: { ...variableChanges, ...variables },
      state: 'COMPLETED',
      endTime: !storedUserTask.instanceID ? new Date() : undefined,
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}
