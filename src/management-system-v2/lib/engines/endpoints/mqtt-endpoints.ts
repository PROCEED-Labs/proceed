import mqtt from 'mqtt';
import { MqttEngine } from '../machines';

const mqttTimeout = 1000;

const _baseTopicPrefix = '';
function getEnginePrefix(engineId: string, prefix = _baseTopicPrefix) {
  const proceedMqttPrefix = `proceed-pms/engine/${engineId}`;
  return prefix ? `${prefix}/${proceedMqttPrefix}` : proceedMqttPrefix;
}

export async function collectEnginesStatus({
  client,
  brokerAddress,
  engineMap,
  baseTopicPrefix = _baseTopicPrefix,
}: {
  client: mqtt.MqttClient;
  brokerAddress: string;
  engineMap: Map<string, MqttEngine & { running: boolean }>;
  baseTopicPrefix?: string;
}) {
  const engineStatusRegex = new RegExp(`^${getEnginePrefix('', baseTopicPrefix)}([^\/]+)\/status`);
  const topic = `${baseTopicPrefix}proceed-pms/engine/+/status`;

  function collectStatusData(topic: string, message: Buffer) {
    const match = topic.match(engineStatusRegex);
    if (!match) return;

    const id = match[1];
    let body;
    try {
      body = JSON.parse(message.toString());
    } catch (_) {
      return;
    }

    const engine = { id, brokerAddress, type: 'mqtt', running: body.running } as const;
    engineMap.set(id, engine);
  }

  client.on('message', collectStatusData);
  await client.subscribeAsync(topic);

  return collectStatusData;
}

const global = globalThis as any;
// [broker-address].engineMap[engine-id] -> engine
type EngineMap = Map<
  string,
  { type: 'mqtt'; id: string; brokerAddress: string; running: boolean; spaceEngine?: undefined }
>;
const proceedMqttEngines: Map<string, { engineMap: EngineMap; collectionStartedAt: number }> =
  global.proceedMqttEngines || (global.proceedMqttEngines = new Map());

const proceedMqttEngineClients: Map<string, mqtt.MqttClient> =
  global.proceedMqttEngineClients || (global.proceedMqttEngineClients = new Map());

export async function getClient(
  brokerAddress: string,
  proceedEngine?: boolean,
  options?: mqtt.IClientOptions,
) {
  if (proceedEngine) {
    const savedClient = proceedMqttEngineClients.get(brokerAddress);
    if (savedClient) return savedClient;

    const client = await mqtt.connectAsync(brokerAddress, options);
    const engineMap = new Map();

    collectEnginesStatus({ client, brokerAddress, engineMap });

    proceedMqttEngineClients.set(brokerAddress, client);
    proceedMqttEngines.set(brokerAddress, { engineMap, collectionStartedAt: Date.now() });
    return client;
  }

  return await mqtt.connectAsync(brokerAddress, options);
}

export async function getCollectedProceedMqttEngines(
  brokerAddress: string,
  minimumCollectionTime?: number,
) {
  try {
    const engineMap = proceedMqttEngines.get(brokerAddress);
    if (!engineMap) return undefined;

    if (minimumCollectionTime) {
      const ellapsedSinceCollection = Date.now() - engineMap.collectionStartedAt;
      const remainingTime = minimumCollectionTime - ellapsedSinceCollection;
      if (remainingTime > 0) await new Promise((res) => setTimeout(res, remainingTime));
    }

    return Array.from(engineMap.engineMap.values()).filter((e) => e.running);
  } catch (e) {
    return [];
  }
}

export async function mqttRequest(
  engineId: string,
  url: string,
  message: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, any>;
    query?: Record<string, any>;
    page?: number;
  },
  mqttClient: mqtt.MqttClient,
) {
  const requestId = crypto.randomUUID();
  const requestTopic = getEnginePrefix(engineId) + '/api' + url;
  await mqttClient.subscribeAsync(requestTopic);

  // handler for the response
  let res: (res: any) => void, rej: (Err: any) => void;
  const receivedAnswer = new Promise<any>((_res, _rej) => {
    res = _res;
    rej = _rej;
  });
  function handler(topic: string, _message: any) {
    const message = JSON.parse(_message.toString());
    if (topic !== requestTopic) return;
    if (
      !message ||
      typeof message !== 'object' ||
      !('type' in message) ||
      message.type !== 'response' ||
      !('id' in message) ||
      message.id !== requestId
    )
      return;

    if ('error' in message) return rej(message.error);

    let result: string | object;

    try {
      result = JSON.parse(message.body);
    } catch (err) {
      result = message.body;
    }

    res(result);
  }
  mqttClient.on('message', handler);

  // send request
  mqttClient.publish(requestTopic, JSON.stringify({ ...message, type: 'request', id: requestId }));

  // await for response or timeout
  setTimeout(rej!, mqttTimeout);
  const response = await receivedAnswer;

  // cleanup
  mqttClient.removeListener('message', handler);

  return response;
}
