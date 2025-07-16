'use server';

import { Engine } from './machines';
import { engineRequest } from './endpoints/index';
import { inlineUserTaskData } from '@proceed/user-task-helper';

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

export async function getStartFormFromMachine(
  definitionId: string,
  versionId: string,
  engine: Engine,
) {
  let html = await engineRequest({
    method: 'get',
    endpoint: '/process/:definitionId/versions/:version/start-form',
    engine,
    pathParams: {
      definitionId,
      version: versionId,
    },
  });

  // initialize the placeholders in the form with empty strings
  // TODO: use the information from the variable data in the bpmn to initialize the actual initial
  // values set by the process designer
  if (html) html = inlineUserTaskData(html, '', '', {}, []);

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
