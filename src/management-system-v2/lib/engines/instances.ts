'use server';

import { Engine } from './machines';
import { engineRequest } from './endpoints/index';
import { userError } from '../user-error';

export async function startInstanceOnMachine(
  definitionId: string,
  versionId: string,
  machine: Engine,
  variables: { [key: string]: any } = {},
) {
  try {
    const response = await engineRequest({
      method: 'post',
      endpoint: '/process/:definitionId/versions/:version/instance',
      engine: machine,
      pathParams: { definitionId, version: versionId },
      body: { variables },
    });

    return response.instanceId as string;
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes(
        'Some variables that require a value at instance start were not provided value',
      )
    ) {
      const missingVariables = err.message.replace(/^.*\((.*)\).*/g, '$1');
      return userError(
        `The instance could not be started due to missing values for required variables (${missingVariables}).`,
      );
    }

    return userError('Failed to start the instance.');
  }
}

export async function resumeInstanceOnMachine(
  definitionId: string,
  instanceId: string,
  machine: Engine,
) {
  await engineRequest({
    method: 'put',
    endpoint: '/process/:definitionId/instance/:instanceID/instanceState',
    engine: machine,
    pathParams: { definitionId, instanceID: instanceId },
    body: { instanceState: 'resume' },
  });
}

export async function pauseInstanceOnMachine(
  definitionId: string,
  instanceId: string,
  machine: Engine,
) {
  await engineRequest({
    method: 'put',
    endpoint: '/process/:definitionId/instance/:instanceID/instanceState',
    engine: machine,
    pathParams: { definitionId, instanceID: instanceId },
    body: { instanceState: 'paused' },
  });
}

export async function stopInstanceOnMachine(
  definitionId: string,
  instanceId: string,
  machine: Engine,
) {
  await engineRequest({
    method: 'put',
    endpoint: '/process/:definitionId/instance/:instanceID/instanceState',
    engine: machine,
    pathParams: { definitionId, instanceID: instanceId },
    body: { instanceState: 'stopped' },
  });
}

export async function updateVariablesOnMachine(
  definitionId: string,
  instanceId: string,
  machine: Engine,
  variables: Record<string, any>,
) {
  await engineRequest({
    method: 'post',
    endpoint: '/process/:definitionId/instance/:instanceId/variables',
    engine: machine,
    pathParams: { definitionId, instanceId },
    body: variables,
  });
}

export async function submitFileToMachine(
  definitionId: string,
  instanceId: string,
  machine: Engine,
  fileName: string,
  fileType: string,
  file: any,
) {
  return await engineRequest({
    method: 'put',
    endpoint: '/resources/process/:definitionId/instance/:instanceId/file/:fileName',
    engine: machine,
    pathParams: { definitionId, instanceId, fileName },
    body: file,
    queryParams: { mimeType: fileType },
  });
}

export async function getFileFromMachine(
  definitionId: string,
  instanceId: string,
  fileName: string,
  machine: Engine,
) {
  return await engineRequest({
    method: 'get',
    endpoint: '/resources/process/:definitionId/instance/:instanceId/file/:fileName',
    engine: machine,
    pathParams: { definitionId, instanceId, fileName },
  });
}
