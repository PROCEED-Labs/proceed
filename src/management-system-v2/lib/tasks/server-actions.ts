'use server';

import { getProcessIds, getVariablesFromElementById } from '@proceed/bpmn-helper';
import { Variable } from '@proceed/bpmn-helper/src/getters';
import {
  getCorrectMilestoneState,
  getCorrectVariableState,
  getGlobalVariables,
  inlineScript,
  inlineUserTaskData,
} from '@proceed/user-task-helper';

import { asyncForEach, asyncMap, deepEquals, pick } from '@/lib/helpers/javascriptHelpers';
import { truthyFilter } from '@/lib/typescript-utils';
import { getCurrentUser } from '@/components/auth';
import { UserFacingError, getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';
import { getDataObject, isErrorResponse } from '@/app/api/spaces/[spaceId]/data/helper';

import db from '@/lib/data/db';
import { getUserTaskById, updateUserTask } from '@/lib/data/user-tasks';

import { Engine } from '@/lib/engines/types';
import { InstanceInfo } from '@/lib/engines/deployment';
import { submitFileToMachine } from '@/lib/engines/instances';
import {
  activateUserTask,
  addOwnerToTaskListEntryOnMachine,
  completeTasklistEntryOnMachine,
  getTaskListFromMachine,
  setTasklistEntryMilestoneValuesOnMachine,
  setTasklistEntryVariableValuesOnMachine,
} from '@/lib/engines/tasklist';
import { getInstance } from '@/lib/data/instance';
import { getProcessBPMN, getProcessHtmlFormHTML } from '../data/processes';
import { getEngineIfAvailable } from '../data/engines';
import { saveInstanceArtifact } from '../data/file-manager-facade';

export async function getGlobalVariablesForHTML(
  spaceId: string,
  initiatorId: string | null,
  html: string,
) {
  return await getGlobalVariables(html, async (varPath) => {
    let segments = varPath.split('.');

    let userId: string | undefined;

    if (segments[0] === '@process-initiator') {
      if (!initiatorId)
        throw new UserFacingError(
          'Invalid selector for global initiator data in execution that does not have an initiator.',
        );
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
    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    let { initialVariables, variableChanges, milestones, milestonesChanges, html } = storedUserTask;

    if (storedUserTask.state === 'READY') {
      let activated = true;
      if (storedUserTask.instanceID && storedUserTask.engineId) {
        try {
          const engine = await getEngineIfAvailable(spaceId, storedUserTask.engineId);
          if (engine && !isUserErrorResponse(engine)) {
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

      if (activated) await updateUserTask(userTaskId, { state: 'ACTIVE' });
    }

    variableChanges = { ...initialVariables, ...(variableChanges || {}) };

    if (milestonesChanges) {
      milestones = (milestones || []).map((milestone) => ({
        ...milestone,
        value: milestonesChanges![milestone.id] ?? milestone.value,
      }));
    }

    if (storedUserTask.instanceID) {
      const instance = await getInstance(spaceId, storedUserTask.instanceID);
      if (isUserErrorResponse(instance)) return instance;
      if (!instance) throw new Error('Cannot retrieve the instance initiator information.');

      const globalVars = await getGlobalVariablesForHTML(spaceId, instance.initiatorId, html);

      // maps relative urls used to get resources on the engine to the MS api to allow them to work here as well
      function mapResourceUrls(variables: Record<string, any>) {
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

      variableChanges = { ...mapResourceUrls(variableChanges), ...globalVars };
    }

    return inlineUserTaskData(html, variableChanges, milestones);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function addOwnerToTaskListEntry(spaceId: string, userTaskId: string, owner: string) {
  try {
    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    let { actualOwner } = storedUserTask;

    if (!actualOwner.includes(owner)) {
      await updateUserTask(userTaskId, {
        actualOwner: [...actualOwner, owner],
      });

      if (storedUserTask.instanceID) {
        const { engineId } = storedUserTask;
        const engine = engineId && (await getEngineIfAvailable(spaceId, engineId));

        if (!engine || isUserErrorResponse(engine)) {
          return userError('Could not find the engine this user task is running on.');
        }

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
  spaceId: string,
  userTaskId: string,
  variables: { [key: string]: any },
) {
  try {
    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    await updateUserTask(userTaskId, {
      variableChanges: { ...storedUserTask.variableChanges, ...variables },
    });

    if (storedUserTask.instanceID) {
      const { engineId } = storedUserTask;
      const engine = engineId && (await getEngineIfAvailable(spaceId, engineId));

      if (!engine || isUserErrorResponse(engine)) {
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

export async function setTasklistMilestoneValues(
  spaceId: string,
  userTaskId: string,
  milestones: { [key: string]: any },
) {
  try {
    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    await updateUserTask(userTaskId, {
      milestonesChanges: { ...storedUserTask.milestonesChanges, ...milestones },
    });

    if (storedUserTask.instanceID) {
      const { engineId } = storedUserTask;
      const engine = engineId && (await getEngineIfAvailable(spaceId, engineId));

      if (!engine || isUserErrorResponse(engine)) {
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
    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    const { variableChanges, milestonesChanges } = storedUserTask;

    if (storedUserTask.instanceID) {
      const { engineId } = storedUserTask;
      const engine = engineId && (await getEngineIfAvailable(spaceId, engineId));

      if (!engine || isUserErrorResponse(engine)) {
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

    await updateUserTask(userTaskId, {
      variableChanges: { ...variableChanges, ...variables },
      state: 'COMPLETED',
      endTime: !storedUserTask.instanceID ? new Date() : undefined,
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function submitFile(spaceId: string, userTaskId: string, formData: FormData) {
  try {
    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    if (!storedUserTask.instanceID) {
      return userError('We cannot save files for locally created user tasks');
    }

    const { engineId } = storedUserTask;
    const engine = engineId && (await getEngineIfAvailable(spaceId, engineId));

    if (!engine || isUserErrorResponse(engine)) {
      return userError('Could not find the engine this user task is running on.');
    }

    const file = formData.get('file') as File;

    const fileName = file.name;
    const fileType = file.type;

    const [_, instanceId] = userTaskId.split('|');
    const [definitionId] = instanceId.split('-_');

    // TODO: implement file storing for user tasks in the MS to allow files to be stored for local
    // user tasks and also for user tasks that are cached in the MS
    if (!engine) throw new Error('Could not find the engine to submit the file to');

    const filePath = await submitFileToMachine(
      definitionId,
      instanceId,
      engine,
      fileName,
      fileType,
      Array.from(new Uint8Array(await file.arrayBuffer())),
    );

    const newFileName = filePath.split('/').pop()!;

    await saveInstanceArtifact(
      spaceId,
      instanceId,
      newFileName,
      file.type,
      Buffer.from(await file.arrayBuffer()),
    );

    return filePath;
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function updateTaskInfo(
  reachableEngines: Engine[],
  reachableWithDeployments: Engine[],
  knownInstances: Record<
    string,
    {
      instanceId: string;
      processId: string;
      environmentId: string;
      versionId: string;
      state: InstanceInfo;
    }
  >,
) {
  // get all users tasks that belong to instances (they were not created in the task editor)
  const knownUserTasks = await db.userTask.findMany({ where: { NOT: { instanceID: null } } });

  const reachableWithUserTasks = reachableEngines.filter((e) =>
    knownUserTasks.some((uT) => uT.engineId === e.id),
  );

  const reachableWithDeploymentsAndUserTasks = Object.values(
    Object.fromEntries(
      reachableWithDeployments.concat(reachableWithUserTasks).map((e) => [e.id, e]),
    ),
  );

  const fetchedUserTasks = (
    await asyncMap(reachableWithDeploymentsAndUserTasks, async (e) => {
      const tasklist = await getTaskListFromMachine(e);

      return tasklist.map((entry) => ({ ...entry, machineId: e.id }));
    })
  )
    .flat()
    .filter((uT) => !!knownInstances[uT.instanceID])
    .map((uT) => [`${uT.id}|${uT.instanceID}|${uT.startTime}`, uT] as const);

  const newUserTasks = fetchedUserTasks.filter(([id]) => {
    return !knownUserTasks.some((kUT) => kUT.id === id);
  });

  const addedUserTasks = (
    await asyncMap(newUserTasks, async ([id, task]) => {
      const relatedInstanceInfo = knownInstances[task.instanceID];

      const machine = reachableEngines.find((e) => e.id === task.machineId);
      if (!machine) return;

      try {
        const definitionId = relatedInstanceInfo.processId;
        const spaceId = relatedInstanceInfo.environmentId;
        const bpmn = await getProcessBPMN(
          definitionId,
          spaceId,
          relatedInstanceInfo.versionId,
          undefined,
          true,
        );

        if (isUserErrorResponse(bpmn)) return;

        const initialVariables = getCorrectVariableState(task, relatedInstanceInfo.state);
        const milestones = await getCorrectMilestoneState(bpmn, task, relatedInstanceInfo.state);

        const fileName = task.attrs['proceed:fileName'];
        const htmlForm = await getProcessHtmlFormHTML(
          definitionId,
          fileName,
          spaceId,
          undefined,
          true,
        );

        if (isUserErrorResponse(htmlForm)) return;

        let html = htmlForm.replace(/\/resources\/process[^"]*/g, (match) => {
          const path = match.split('/');
          return `/api/private/${spaceId}/engine/resources/process/${task.instanceID}/images/${path.pop()}`;
        });

        const processIds = await getProcessIds(bpmn);
        let variableDefinitions: undefined | Variable[];
        if (processIds.length) {
          const [processId] = processIds;
          variableDefinitions = await getVariablesFromElementById(bpmn, processId);
        }

        html = inlineScript(html, task.instanceID, id, variableDefinitions);

        return {
          ...task,
          attrs: undefined,
          performers: undefined,
          id,
          taskId: task.id,
          fileName,
          potentialOwners: task.performers,
          startTime: task.startTime,
          environmentId: relatedInstanceInfo.environmentId,
          initialVariables,
          variableChanges: {},
          milestones,
          milestonesChanges: {},
          html,
        };
      } catch (err) {
        console.error('Error', err);
      }
    })
  ).filter(truthyFilter);

  const changeableEntries = ['actualOwner', 'state', 'priority', 'progress', 'endTime'] as const;

  const updatedUserTasks = fetchedUserTasks
    .filter(([id, data]) => {
      const knownUserTask = knownUserTasks.find((kUT) => kUT.id === id);
      if (!knownUserTask) return false;

      const potentiallyChanged = pick(
        { ...knownUserTask, endTime: knownUserTask.endTime && knownUserTask.endTime.getTime() },
        changeableEntries,
      );
      const newInfo = pick(data, changeableEntries);

      return !deepEquals(potentiallyChanged, newInfo);
    })
    .map(([id, data]) => [id, pick(data, changeableEntries)] as const);

  await db.$transaction(async (tx) => {
    await tx.userTask.createMany({
      data: addedUserTasks.map((uT) => ({
        ...uT,
        startTime: new Date(uT.startTime),
        endTime: uT.endTime === null ? null : new Date(uT.endTime),
      })),
    });

    await asyncForEach(updatedUserTasks, async ([id, data]) => {
      await tx.userTask.update({
        where: { id },
        data: {
          ...data,
          endTime: data.endTime === null ? null : new Date(data.endTime),
        },
      });
    });
  });
}
