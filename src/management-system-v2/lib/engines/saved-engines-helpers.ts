import { Engine as SavedEngine } from '@prisma/client';
import { Engine, HttpEngine, MqttEngine } from './machines';
import { DeployedProcessInfo, getDeployments } from './deployment';
import {
  collectEnginesStatus,
  getClient,
  getCollectedProceedMqttEngines,
  mqttRequest,
} from './endpoints/mqtt-endpoints';
import endpointBuilder from './endpoints/endpoint-builder';
import { httpRequest } from './endpoints/http-endpoints';
import { engineRequest } from './endpoints';

const mqttTimeout = 2000;

/* -------------------------------------------------------------------------------------------------
 * Saved Engines -> Engines
 * -----------------------------------------------------------------------------------------------*/

// TODO: find a better more standardized way to do this
async function getMqttEngines(
  engine: SavedEngine,
): Promise<SavedEngine & { machines: MqttEngine[] }> {
  try {
    const client = await getClient(engine.address, !engine.environmentId);

    if (!engine.environmentId) {
      const collectedEngines = await getCollectedProceedMqttEngines(engine.address, mqttTimeout);
      if (collectedEngines) return { ...engine, machines: collectedEngines };
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

    return {
      ...engine,
      machines: Array.from(engineMap.values())
        .filter((v) => v.running)
        .map((e) => ({
          id: e.id,
          type: 'mqtt',
          spaceEngine: true,
          brokerAddress: engine.address,
        })),
    };
  } catch (err) {
    console.error('Error', err);
    return { ...engine, machines: [] };
  }
}

async function getHttpEngine(
  engine: SavedEngine,
): Promise<SavedEngine & { machines: HttpEngine[] }> {
  try {
    const { id } = await httpRequest(
      engine.address,
      endpointBuilder('get', '/machine/:properties', { pathParams: { properties: 'id' } }),
      'GET',
    );

    return {
      ...engine,
      machines: [
        {
          type: 'http',
          id,
          address: engine.address,
          spaceEngine: true,
        },
      ],
    };
  } catch (err) {
    return { ...engine, machines: [] };
  }
}

export async function savedEnginesToEngines(
  spaceEngines: SavedEngine[],
): Promise<(SavedEngine & { machines: Engine[] })[]> {
  const enginesRequests = [];
  for (const savedEngine of spaceEngines) {
    if (savedEngine.address.startsWith('http')) enginesRequests.push(getHttpEngine(savedEngine));
    else if (savedEngine.address.startsWith('mqtt'))
      enginesRequests.push(getMqttEngines(savedEngine));
  }

  return Promise.all(enginesRequests);
}

/* -------------------------------------------------------------------------------------------------
 * Saved Engines -> Deployed processes
 * -----------------------------------------------------------------------------------------------*/

async function getMqttBrokerEnginesProcesses(
  brokerAddress: string,
  proceedBroker?: boolean,
): Promise<DeployedProcessInfo[]> {
  let processPromises: Promise<DeployedProcessInfo[]>[] = [];
  const client = await getClient(brokerAddress, proceedBroker);

  const collectedEngines =
    proceedBroker && (await getCollectedProceedMqttEngines(brokerAddress, mqttTimeout));
  if (collectedEngines) {
    processPromises = collectedEngines.map((engine) =>
      mqttRequest(engine.id, endpointBuilder('get', '/process/'), { method: 'GET' }, client),
    );
  } else {
    client.on('message', (topic, message) => {
      const match = topic.match(/proceed-pms\/engine\/(.+)\/status/);
      if (!match) return;

      try {
        if (!JSON.parse(message.toString()).running) return;
      } catch (_) {
        return;
      }

      processPromises.push(
        mqttRequest(match[1], endpointBuilder('get', '/process/'), { method: 'GET' }, client),
      );
    });
    await client.subscribeAsync(`proceed-pms/engine/+/status`);

    await new Promise((res) => setTimeout(res, mqttTimeout));
    await client.endAsync();
  }

  const results = await Promise.allSettled(processPromises);
  const processes = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    processes.push(...result.value);
  }

  return processes;
}

// Technically you could use the function above and getDeployments, but it's faster to start fetching processes
// as soon as they're discovered
export async function getDeployedProcessesFromSavedEngines(spaceEngines: SavedEngine[]) {
  const promises = [];

  for (const engine of spaceEngines) {
    if (engine.address.startsWith('http')) {
      promises.push(
        getDeployments([
          {
            type: 'http',
            id: '', // id is not necessary for this request
            address: engine.address,
            spaceEngine: true,
          },
        ]),
      );
    } else if (engine.address.startsWith('mqtt')) {
      promises.push(getMqttBrokerEnginesProcesses(engine.address, engine.environmentId === null));
    }
  }

  const results = await Promise.allSettled(promises);

  const processes = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    processes.push(...result.value);
  }

  return processes;
}
