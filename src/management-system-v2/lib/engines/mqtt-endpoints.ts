import mqtt from 'mqtt';
import { env } from '@/lib/env-vars';

const mqttTimeout = 1000;

const mqttCredentials = {
  password: env.MQTT_PASSWORD,
  username: env.MQTT_USERNAME,
};

const baseTopicPrefix = env.MQTT_BASETOPIC ? env.MQTT_BASETOPIC + '/' : '';

export function getClient(options?: mqtt.IClientOptions): Promise<mqtt.MqttClient> {
  if (!env.MQTT_SERVER_ADDRESS) throw new Error('MQTT_SERVER_ADDRESS is not set');

  return new Promise((res, rej) => {
    const client = mqtt.connect(env.MQTT_SERVER_ADDRESS, {
      ...mqttCredentials,
      ...options,
    });
    client.on('connect', () => res(client));
    client.on('error', (err) => rej(err));
  });
}

function subscribeToTopic(client: mqtt.MqttClient, topic: string) {
  return new Promise<void>((res, rej) => {
    setTimeout(rej, mqttTimeout); // Timeout if the subscription takes too long
    client.subscribe(topic, (err) => {
      if (err) rej(err);
      res();
    });
  });
}

function getEnginePrefix(engineId: string) {
  return `${baseTopicPrefix}proceed-pms/engine/${engineId}`;
}

export async function getEngines() {
  const client = await getClient({
    connectTimeout: mqttTimeout,
  });

  const engines: { engineId: string; running: boolean; version: string }[] = [];

  await subscribeToTopic(client, `${getEnginePrefix('+')}/status`);

  // All retained messages are sent at once
  // The broker should bundle them in one tcp packet,
  // after it is parsed all messages are in the queue, and handled before close
  // is handled, as the packets where pushed to the queue before the close event was emitted.
  // This is of course subject to the implementation of the broker,
  // however for a small amount of engines it should be fine.
  await new Promise<void>((res) => {
    setTimeout(res, mqttTimeout); // Timeout in case we receive no messages

    client.on('message', (topic, message) => {
      const match = topic.match(new RegExp(`^${getEnginePrefix('')}([^\/]+)\/status`));
      if (match) {
        const engineId = match[1];
        const status = JSON.parse(message.toString());
        engines.push({ engineId, ...status });
        res();
      }
    });
  });

  await client.endAsync();

  return engines;
}
