import 'server-only';

import { Engine } from './machines';
import { engineRequest } from './endpoints';

export async function startInstanceOnMachine(
  definitionId: string,
  versionId: string,
  machine: Engine,
  variables: { [key: string]: any } = {},
) {
  const response = await engineRequest({
    method: 'post',
    endpoint: '/process/:definitionId/versions/:version/instance',
    engine: machine,
    params: { definitionId, version: versionId },
    body: { variables },
  });

  return response.instanceId as string;
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
    params: { definitionId, instanceID: instanceId },
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
    params: { definitionId, instanceID: instanceId },
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
    params: { definitionId, instanceID: instanceId },
    body: { instanceState: 'stopped' },
  });
}
