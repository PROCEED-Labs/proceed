import { Engine as SavedEngine } from '@prisma/client';
import { SpaceEngine } from './machines';
import { DeployedProcessInfo, getDeployments } from './deployment';
import { engineAccumulator, getClient, mqttRequest } from './endpoints/mqtt-endpoints';
import endpointBuilder from './endpoints/endpoint-builder';
import { httpRequest } from './endpoints/http-endpoints';

const mqttTimeout = 2000;

// TODO: find a better more standardized way to do this
async function getMqttEngines(engine: SavedEngine): Promise<SpaceEngine[]> {
  const client = await getClient(engine.address);
  await client.subscribeAsync(`proceed-pms/engine/+/status`);

  const enginesMap = new Map();
  client.on('message', (topic, m) => engineAccumulator(topic, m.toString(), enginesMap));

  await new Promise((res) => setTimeout(res, mqttTimeout));

  await client.endAsync();

  return Array.from(enginesMap.values())
    .filter((v) => v.running)
    .map((e) => ({
      id: e.id,
      type: 'mqtt',
      spaceEngine: true,
      brokerAddress: engine.address,
    }));
}

async function getHttpEngine(engine: SavedEngine): Promise<[SpaceEngine]> {
  const { id } = await httpRequest(
    engine.address,
    endpointBuilder('get', '/machine/:properties', { properties: 'id' }),
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

export async function spaceEnginesToEngines(spaceEngines: SavedEngine[]): Promise<SpaceEngine[]> {
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

async function getMqttEnginesProcesses(engine: SavedEngine): Promise<DeployedProcessInfo[]> {
  const processPromises: Promise<DeployedProcessInfo[]>[] = [];
  const client = await getClient(engine.address);

  client.subscribeAsync(`proceed-pms/engine/+/status`);

  client.on('message', (topic, message) => {
    const match = topic.match(/proceed-pms\/engine\/(.+)\/status/);
    if (!match) return;

    if (!JSON.parse(message.toString()).running) return;

    processPromises.push(
      mqttRequest(match[1], endpointBuilder('get', '/process/'), { method: 'GET' }, client),
    );
  });

  await new Promise((res) => setTimeout(res, mqttTimeout));
  await client.endAsync();

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
export async function getDeployedProcessesFromSpaceEngines(spaceEngines: SavedEngine[]) {
  const promises = [];

  for (const engine of spaceEngines) {
    if (engine.address.startsWith('http')) {
      promises.push(
        getDeployments([
          {
            type: 'http',
            id: '', // TODO: what should I do with id here?
            address: engine.address,
            spaceEngine: true,
          },
        ]),
      );
    } else if (engine.address.startsWith('mqtt')) {
      promises.push(getMqttEnginesProcesses(engine));
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
