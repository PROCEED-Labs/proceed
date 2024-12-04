import { Engine as SavedEngine } from '@prisma/client';
import { Engine } from './machines';
import { DeployedProcessInfo, getDeployments } from './deployment';
import { engineAccumulator, getClient, mqttRequest } from './endpoints/mqtt-endpoints';
import endpointBuilder from './endpoints/endpoint-builder';

// TODO: join this with other mqtt timeouts
const mqttTimeout = 2000;

// TODO: find a better more standardized way to do this
async function getMqttEngines(engine: SavedEngine): Promise<Engine[]> {
  const client = await getClient(engine.address);
  await client.subscribeAsync(`proceed-pms/engine/+/status`);

  const enginesMap = new Map();
  client.on('message', (topic, message) => {
    if (!topic.match(/proceed-pms\/engine\/(.+)\/status/)) return;
    engineAccumulator(topic, message.toString(), enginesMap);
  });

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

export async function spaceEnginesToEngines(spaceEngines: SavedEngine[]): Promise<Engine[]> {
  const engines: Engine[] = [];
  const mqttEngines = [];

  for (const savedEngine of spaceEngines) {
    if (savedEngine.address.startsWith('http')) {
      engines.push({
        type: 'http',
        id: '', // TODO: what should I do with id here?
        address: savedEngine.address,
        spaceEngine: true,
      });
    } else if (savedEngine.address.startsWith('mqtt')) {
      mqttEngines.push(getMqttEngines(savedEngine));
    }
  }

  return [...engines, ...(await Promise.all(mqttEngines)).flat()];
}

async function getMqttEnginesProcesses(engine: SavedEngine): Promise<DeployedProcessInfo[]> {
  const processPromises: Promise<DeployedProcessInfo[]>[] = [];
  const client = await getClient(engine.address);

  client.subscribeAsync(`proceed-pms/engine/+/status`);

  client.on('message', (topic, message) => {
    const match = topic.match(/proceed-pms\/engine\/(.+)\/status/);
    if (!match) return;

    if (!JSON.parse(message.toString()).running) return;

    // TODO: check if the engine is running

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
