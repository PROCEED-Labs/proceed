import { type EngineConnection } from '@prisma/client';
import { Engine, isHttpConnection, isMqttConnection } from './types';
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
async function getMqttEngines(connection: EngineConnection): Promise<Engine[]> {
  const client = await getClient(connection.address, !connection.environmentId);

  if (!connection.environmentId) {
    const collectedEngines = await getCollectedProceedMqttEngines(connection.address, mqttTimeout);
    if (collectedEngines)
      return collectedEngines.map((e) => ({
        id: e.id,
        connections: [connection],
      }));
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
      connections: [connection],
      spaceEngine: true as const,
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

async function getHttpEngine(connection: EngineConnection): Promise<[Engine]> {
  const response = await httpRequest(
    connection.address,
    endpointBuilder('get', '/machine/:properties', { pathParams: { properties: 'id,name' } }),
    'GET',
  );

  if (response.error) throw response.error;

  const { id, name } = response.result;

  return [
    {
      id,
      name,
      connections: [connection],
      spaceEngine: true,
    },
  ];
}

export async function resolveEngines(connections: EngineConnection[]): Promise<Engine[]> {
  const enginesRequests = [];
  for (const connection of connections) {
    if (isHttpConnection(connection)) enginesRequests.push(getHttpEngine(connection));
    else if (isMqttConnection(connection)) enginesRequests.push(getMqttEngines(connection));
  }

  const engines = [];
  for (const request of await Promise.allSettled(enginesRequests))
    if (request.status === 'fulfilled') engines.push(...request.value);

  const uniqueEngines: Record<string, Engine> = {};

  for (const engine of engines) {
    const existingEngine = uniqueEngines[engine.id];
    if (existingEngine) {
      // TODO: this assumes that every connection in "connections" was unique
      existingEngine.connections.push(...engine.connections);
    } else {
      uniqueEngines[engine.id] = engine;
    }
  }

  return Object.values(uniqueEngines);
}
