import mqtt from 'mqtt';
import { env } from '@/lib/env-vars';
import { on } from 'events';

const mqttTimeout = 1000;

const mqttCredentials = {
  password: env.MQTT_PASSWORD,
  username: env.MQTT_USERNAME,
};

const baseTopicPrefix = env.MQTT_BASETOPIC ? env.MQTT_BASETOPIC + '/' : '';

/** Returns an mqtt client that connects to PROCEED's broker */
export function getProceedClient(options?: mqtt.IClientOptions): Promise<mqtt.MqttClient> {
  const address = env.MQTT_SERVER_ADDRESS || '';

  return mqtt.connectAsync(address, {
    ...mqttCredentials,
    ...options,
  });
}

// Maybe a bit redundant, but if we decide to change libraries we can just update this function
export function getClient(brokerUrl: string, options?: mqtt.IClientOptions) {
  return mqtt.connectAsync(brokerUrl, options);
}

const mqttClient: Promise<mqtt.MqttClient> =
  (globalThis as any).mqttClient || ((globalThis as any).mqttClient = getProceedClient());

function getEnginePrefix(engineId: string) {
  return `${baseTopicPrefix}proceed-pms/engine/${engineId}`;
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
  customClient?: mqtt.MqttClient,
) {
  const client = customClient ?? (await mqttClient);

  const requestId = crypto.randomUUID();
  const requestTopic = getEnginePrefix(engineId) + '/api' + url;
  await client.subscribeAsync(requestTopic);

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
  client.on('message', handler);

  // send request
  client.publish(requestTopic, JSON.stringify({ ...message, type: 'request', id: requestId }));

  // await for response or timeout
  setTimeout(rej!, mqttTimeout);
  const response = await receivedAnswer;

  // cleanup
  client.removeListener('message', handler);

  return response;
}

type CollectedData = {
  onMessageCallback: mqtt.OnMessageCallback;
  data?: any;
  staleTimeout?: NodeJS.Timeout;
};
const collectedDataEntries: Map<string, CollectedData> =
  (globalThis as any).collectedDataEntries ||
  ((globalThis as any).collectedDataEntries = new Map());

export async function collectMqttData<TData>(
  topic: string,
  accumulator: (topic?: string, data?: any, previousState?: TData) => TData | undefined,
  validTopic?: (topic: string) => boolean,
  staleAfter?: number,
  customClient?: mqtt.MqttClient,
): Promise<TData | undefined> {
  let collectedData = collectedDataEntries.get(topic);

  if (!collectedData) {
    collectedData = {
      onMessageCallback(messageTopic, message) {
        if (validTopic ? !validTopic(messageTopic) : messageTopic !== topic) return;

        if (staleAfter) {
          clearTimeout(collectedData!.staleTimeout);
          collectedData!.staleTimeout = setTimeout(() => clearCollectedData(topic), staleAfter);
        }

        collectedData!.data = accumulator(messageTopic, message.toString(), collectedData!.data);

        // TODO: do something with message
      },
      staleTimeout: staleAfter
        ? setTimeout(() => clearCollectedData(topic), staleAfter)
        : undefined,
    };

    collectedDataEntries.set(topic, collectedData);

    const client = customClient || (await mqttClient);
    client.on('message', collectedData.onMessageCallback);
    await client.subscribeAsync(topic);
  } else {
    // if the accumulator returns data -> valid data
    const data = accumulator(undefined, undefined, collectedData.data);
    if (data) return data;
  }

  // If we get here, we need to fetch the data from scratch
  // So we wait to get messages for a while
  await new Promise((res) => setTimeout(res, mqttTimeout));

  // Call without message, to let the accumulator remove stale data if it needs to
  // Don't change the actual stored data to avoid race conditions (i'm not 100% sure about this)
  return accumulator(undefined, undefined, collectedData.data);
}

export async function clearCollectedData(topic: string) {
  const collectedData = collectedDataEntries.get(topic);
  if (!collectedData) return;

  const client = await mqttClient;
  client.removeListener('message', collectedData.onMessageCallback);
  await client.unsubscribeAsync(topic);
  collectedDataEntries.delete(topic);
}

type EngineStatus = Map<string, { id: string; running: boolean; version: string }>;
const engineStatusRegex = new RegExp(`^${getEnginePrefix('')}([^\/]+)\/status`);
export function engineAccumulator(topic?: string, message?: string, state?: EngineStatus) {
  if (!topic || !message) return state;

  const match = topic.match(engineStatusRegex);
  if (!match) return state;
  const id = match[1];

  const body = JSON.parse(message);
  state = state || new Map();
  state.set(id, { id, ...body });

  return state;
}

export async function getEngines() {
  const engines = await collectMqttData(
    `${baseTopicPrefix}proceed-pms/engine/+/status`,
    engineAccumulator,
    (topic) => engineStatusRegex.test(topic),
    60 * 60_000,
  );
  if (engines) return Array.from(engines.values());
  else return [];
}
