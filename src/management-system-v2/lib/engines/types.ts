import { EngineConnection, Engine as DBEngine } from '@prisma/client';

type Discriminator = { spaceEngine?: undefined } | { spaceEngine: true };

export type MqttEngine = {
  type: 'mqtt';
  name?: string;
  id: string;
  brokerAddress: string;
} & Discriminator;
export type Engine = {
  id: string;
  name?: string | null;
  connections: { reachable: boolean; connection: EngineConnection }[];
} & Discriminator;

export type Connection = EngineConnection & {
  engines: { reachable: boolean; engine: DBEngine }[];
};

export type SpaceEngine = Extract<Engine, { spaceEngine: true }>;

export function isHttpConnection(connection: EngineConnection) {
  return connection.address.startsWith('http');
}
export function isMqttConnection(connection: EngineConnection) {
  return connection.address.startsWith('mqtt');
}
