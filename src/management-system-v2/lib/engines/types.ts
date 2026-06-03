import type { EngineConnection } from '@prisma/client';

type Discriminator = { spaceEngine?: undefined } | { spaceEngine: true };

export type MqttEngine = {
  type: 'mqtt';
  name?: string;
  id: string;
  brokerAddress: string;
} & Discriminator;
export type HttpEngine = {
  type: 'http';
  name?: string;
  id: string;
  address: string;
} & Discriminator;
export type Engine = { id: string; name?: string; connections: EngineConnection[] } & Discriminator;

export function isHttpConnection(connection: EngineConnection) {
  return connection.address.startsWith('http');
}
export function isMqttConnection(connection: EngineConnection) {
  return connection.address.startsWith('mqtt');
}

export type SpaceEngine = Extract<Engine, { spaceEngine: true }>;
export type ProceedEngine = Extract<Engine, { spaceEngine?: undefined }>;
