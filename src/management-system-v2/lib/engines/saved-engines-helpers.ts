import { Engine as SavedEngine } from '@prisma/client';
import { Engine, HttpEngine, MqttEngine } from './types';
import {
  collectEnginesStatus,
  getClient,
  getCollectedProceedMqttEngines,
} from './endpoints/mqtt-endpoints';
import endpointBuilder from './endpoints/endpoint-builder';
import { httpRequest } from './endpoints/http-endpoints';

const mqttTimeout = 2000;

/* -------------------------------------------------------------------------------------------------
 * Saved Engines -> Engines
 * -----------------------------------------------------------------------------------------------*/

// TODO: find a better more standardized way to do this
async function getMqttEngines(engine: SavedEngine): Promise<MqttEngine[]> {
  const client = await getClient(engine.address, !engine.environmentId);

  if (!engine.environmentId) {
    const collectedEngines = await getCollectedProceedMqttEngines(engine.address, mqttTimeout);
    if (collectedEngines) return collectedEngines;
  }

  const engineMap = new Map();
  await collectEnginesStatus({
    client,
    brokerAddress: engine.address,
    engineMap,
  });
  await new Promise((res) => setTimeout(res, mqttTimeout));

  // NOTE: not awaiting this could be a problem if hosted on vercel
  client.endAsync();

  return Array.from(engineMap.values())
    .filter((v) => v.running)
    .map((e) => ({
      id: e.id,
      type: 'mqtt',
      spaceEngine: true,
      brokerAddress: engine.address,
    }));
}

async function getHttpEngine(engine: SavedEngine): Promise<[HttpEngine]> {
  const { id } = await httpRequest(
    engine.address,
    endpointBuilder('get', '/machine/:properties', { pathParams: { properties: 'id' } }),
    'GET',
  );

  return [
    {
      type: 'http',
      id,
      address: engine.address,
      spaceEngine: true,
    },
  ];
}

export async function savedEnginesToEngines(spaceEngines: SavedEngine[]): Promise<Engine[]> {
  const enginesRequests = [];
  for (const savedEngine of spaceEngines) {
    if (savedEngine.address.startsWith('http')) enginesRequests.push(getHttpEngine(savedEngine));
    else if (savedEngine.address.startsWith('mqtt'))
      enginesRequests.push(getMqttEngines(savedEngine));
  }

  const engines = [];
  for (const request of await Promise.allSettled(enginesRequests))
    if (request.status === 'fulfilled') engines.push(...request.value);

  return engines;
}

/* -------------------------------------------------------------------------------------------------
 * Saved Engines -> Deployed processes
 * -----------------------------------------------------------------------------------------------*/
