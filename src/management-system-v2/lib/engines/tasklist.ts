'use server';

import { Engine } from './types';
import { engineRequest } from './endpoints/index';

export type TaskListEntry = {
  id: string;
  name: string;
  taskId: string;
  instanceID: string;
  attrs: {
    'proceed:fileName': string;
  };
  actualOwner: string[];
  state: string;
  status: string;
  owner: string;
  priority: number;
  performers: { user?: string[]; roles: string[] };
  progress: 0;
  startTime: number;
  endTime: number | null;
};

export async function getTaskListFromMachine(machine: Engine) {
  const entries = (await engineRequest({
    method: 'get',
    endpoint: '/tasklist/api/',
    engine: machine,
  })) as TaskListEntry[];

  return entries;
}

export async function activateUserTask(
  machine: Engine,
  instanceId: string,
  userTaskId: string,
  startTime: number,
) {
  await engineRequest({
    method: 'put',
    endpoint: '/tasklist/api/active',
    engine: machine,
    queryParams: {
      instanceID: instanceId,
      userTaskID: userTaskId,
      startTime: `${startTime}`,
    },
    body: { active: true },
  });
}

export async function setTasklistEntryVariableValuesOnMachine(
  machine: Engine,
  instanceId: string,
  userTaskId: string,
  variables: { [key: string]: any },
) {
  await engineRequest({
    method: 'put',
    endpoint: '/tasklist/api/variable',
    engine: machine,
    queryParams: {
      instanceID: instanceId,
      userTaskID: userTaskId,
    },
    body: variables,
  });
}

export async function setTasklistEntryMilestoneValuesOnMachine(
  machine: Engine,
  instanceId: string,
  userTaskId: string,
  milestones: { [key: string]: any },
) {
  await engineRequest({
    method: 'put',
    endpoint: '/tasklist/api/milestone',
    engine: machine,
    queryParams: {
      instanceID: instanceId,
      userTaskID: userTaskId,
    },
    body: milestones,
  });
}

export async function completeTasklistEntryOnMachine(
  machine: Engine,
  instanceId: string,
  userTaskId: string,
  variables: { [key: string]: any },
) {
  await engineRequest({
    method: 'post',
    endpoint: '/tasklist/api/userTask',
    engine: machine,
    queryParams: {
      instanceID: instanceId,
      userTaskID: userTaskId,
    },
    body: variables,
  });
}

export async function addOwnerToTaskListEntryOnMachine(
  machine: Engine,
  instanceId: string,
  userTaskId: string,
  owner: string,
) {
  const updatedOwners = await engineRequest({
    method: 'post',
    endpoint: '/tasklist/api/userTask/owner',
    engine: machine,
    queryParams: {
      instanceID: instanceId,
      userTaskID: userTaskId,
    },
    body: { owner },
  });

  return updatedOwners as string[];
}
