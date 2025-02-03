import 'server-only';

import { Engine } from './machines';
import { engineRequest } from './endpoints';

export async function startInstanceOnMachine(
  definitionId: string,
  versionId: string,
  machine: Engine,
) {
  const instanceId = await engineRequest({
    method: 'post',
    endpoint: '/process/:definitionId/versions/:version/instance',
    engine: machine,
    params: { definitionId, version: versionId },
    body: { variables: {} },
  });

  console.log(instanceId);
  return instanceId;
}
