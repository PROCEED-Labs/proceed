import 'server-only';

import { Engine } from './machines';
import { engineRequest } from './endpoints';

export type TaskListEntry = {
  id: string;
  name: string;
  taskId: string;
  instanceID: string;
  attrs: {
    'proceed:fileName': string;
  };
  state: string;
  status: string;
  owner: string;
  priority: number;
  performers: string[];
  progress: 0;
  startTime: number;
  endTime: number;
};

export async function getTaskListFromMachine(machine: Engine) {
  const entries = (await engineRequest({
    method: 'get',
    endpoint: '/tasklist/api/',
    engine: machine,
  })) as TaskListEntry[];

  return entries.map(({ id, instanceID, startTime, ...rest }) => ({
    ...rest,
    id: `${id}|${instanceID}|${startTime}`,
    taskId: id,
    instanceID,
    startTime,
  }));
}

export async function getTasklistEntryHTMLFromMachine(
  machine: Engine,
  instanceId: string,
  userTaskId: string,
  startTime: number,
) {
  return (await engineRequest({
    method: 'get',
    endpoint: '/tasklist/api/userTask',
    engine: machine,
    queryParams: {
      instanceID: instanceId,
      userTaskID: userTaskId,
      startTime: `${startTime}`,
    },
  })) as string;
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
    endpoint: '/tasklist/api/variable',
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
