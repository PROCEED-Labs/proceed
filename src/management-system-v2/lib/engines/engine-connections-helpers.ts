import { type EngineConnection } from '@prisma/client';
import { Engine, HttpEngine, MqttEngine } from './types';
import {
  collectEnginesStatus,
  getClient,
  getCollectedProceedMqttEngines,
} from './endpoints/mqtt-endpoints';
import endpointBuilder from './endpoints/endpoint-builder';
import { httpRequest } from './endpoints/http-endpoints';
import { asyncMap } from '../helpers/javascriptHelpers';
import { engineRequest } from './endpoints';

const mqttTimeout = 2000;

/* -------------------------------------------------------------------------------------------------
 * Saved Engine Connections -> Engines
 * -----------------------------------------------------------------------------------------------*/

// TODO: find a better more standardized way to do this
async function getMqttEngines(connection: EngineConnection): Promise<MqttEngine[]> {
  const client = await getClient(connection.address, !connection.environmentId);

  if (!connection.environmentId) {
    const collectedEngines = await getCollectedProceedMqttEngines(connection.address, mqttTimeout);
    if (collectedEngines) return collectedEngines;
  }

  const engineMap = new Map();
  await collectEnginesStatus({
    client,
    brokerAddress: connection.address,
    engineMap,
  });
  await new Promise((res) => setTimeout(res, mqttTimeout));

  // NOTE: not awaiting this could be a problem if hosted on vercel
  client.endAsync();

  const reachableEngines = Array.from(engineMap.values())
    .filter((v) => v.running)
    .map((e) => ({
      id: e.id,
      type: 'mqtt' as const,
      spaceEngine: true as const,
      brokerAddress: connection.address,
    }));

  const extendedEngineData = await asyncMap(reachableEngines, async (e) => {
    let name;

    try {
      ({ name } = await engineRequest({
        engine: e,
        method: 'get',
        endpoint: '/machine/:properties',
        pathParams: { properties: 'name' },
      }));
    } catch (err) {}

    return {
      ...e,
      name,
    };
  });

  return extendedEngineData;
}

async function getHttpEngine(connection: EngineConnection): Promise<[HttpEngine]> {
  const { id, name } = await httpRequest(
    connection.address,
    endpointBuilder('get', '/machine/:properties', { pathParams: { properties: 'id,name' } }),
    'GET',
  );

  return [
    {
      type: 'http',
      id,
      name,
      address: connection.address,
      spaceEngine: true,
    },
  ];
}

export async function resolveEngines(connections: EngineConnection[]): Promise<Engine[]> {
  const enginesRequests = [];
  for (const connection of connections) {
    if (connection.address.startsWith('http')) enginesRequests.push(getHttpEngine(connection));
    else if (connection.address.startsWith('mqtt'))
      enginesRequests.push(getMqttEngines(connection));
  }

  const engines = [];
  for (const request of await Promise.allSettled(enginesRequests))
    if (request.status === 'fulfilled') engines.push(...request.value);

  return engines;
}
