import 'server-only';

import { Engine } from './machines';
import { engineRequest } from './endpoints';

export async function startInstanceOnMachine(
  definitionId: string,
  versionId: string,
  machine: Engine,
) {
  const response = await engineRequest({
    method: 'post',
    endpoint: '/process/:definitionId/versions/:version/instance',
    engine: machine,
    params: { definitionId, version: versionId },
    body: { variables: {} },
  });

  return response.instanceId as string;
}
