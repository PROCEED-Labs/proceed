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

import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import { truthyFilter } from '@/lib/typescript-utils';
import { getCurrentUser } from '@/components/auth';
import { UserFacingError, getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';
import { getDataObject, isErrorResponse } from '@/app/api/spaces/[spaceId]/data/helper';

import db from '@/lib/data/db';
import { getUserById } from '@/lib/data/db/iam/users';
import {
  addUserTasks,
  deleteUserTask,
  getUserTaskById,
  getUserTasks,
  updateUserTask,
} from '@/lib/data/user-tasks';

import { ExtendedTaskListEntry, UserTask } from '@/lib/user-task-schema';

import { Engine } from '@/lib/engines/types';
import { getDeployment as fetchDeployment } from '@/lib/engines/deployment';
import { submitFileToMachine } from '@/lib/engines/instances';
import {
  activateUserTask,
  addOwnerToTaskListEntryOnMachine,
  completeTasklistEntryOnMachine,
  getTaskListFromMachine,
  getUserTaskFileFromMachine,
  setTasklistEntryMilestoneValuesOnMachine,
  setTasklistEntryVariableValuesOnMachine,
} from '@/lib/engines/tasklist';
import { getInstance } from '@/lib/data/instance';

export async function getAvailableTaskListEntries(spaceId: string, engines: Engine[]) {
  try {
    let stored = await getUserTasks();

    if (isUserErrorResponse(stored)) {
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
  engine: Engine | null,
) {
  try {
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

      html = await getUserTaskFileFromMachine(engine, definitionId, filename);

      variableChanges = initialVariables;

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
      if (!variables || !engine) return variables;

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
      const instance = await getInstance(spaceId, storedUserTask.instanceID);
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
