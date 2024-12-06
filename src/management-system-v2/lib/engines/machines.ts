import { getEngines as getMqttEngines } from './endpoints/mqtt-endpoints';
type MqttEngine = { type: 'mqtt'; id: string } & (
  | { spaceEngine?: undefined }
  | { spaceEngine: true; brokerAddress: string }
);
type HttpEngine = { type: 'http'; id: string; address: string } & (
  | { spaceEngine?: undefined }
  | { spaceEngine: true }
);
export type Engine = MqttEngine | HttpEngine;
export type SpaceEngine = Extract<Engine, { spaceEngine: true }>;

// TODO: implement discovery
export async function getProceedEngines(): Promise<Engine[]> {
  return (await getMqttEngines()).map((e) => ({ ...e, type: 'mqtt' }));
}
