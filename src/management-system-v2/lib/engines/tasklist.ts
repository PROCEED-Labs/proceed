import 'server-only';

import { Engine } from './machines';
import { engineRequest } from './endpoints';

export type TaskListEntry = {
  id: string;
  name: string;
  instanceID: string;
  attrs: {
    'proceed:fileName': string;
  };
  state: string;
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

  return entries;
}

export async function activateUserTask(
  machine: Engine,
  instanceId: string,
  userTaskId: string,
  startTime: number,
) {
  await engineRequest({
    method: 'get',
    endpoint: '/tasklist/api/userTask',
    engine: machine,
    queryParams: {
      instanceID: instanceId,
      userTaskID: userTaskId,
      startTime: `${startTime}`,
    },
  });
}

export async function getUserTaskFileFromMachine(
  engine: Engine,
  definitionId: string,
  fileName: string,
) {
  const html = await engineRequest({
    method: 'get',
    endpoint: '/process/:definitionId/user-tasks/:fileName',
    engine,
    pathParams: {
      definitionId,
      fileName,
    },
  });
  return html as string;
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
