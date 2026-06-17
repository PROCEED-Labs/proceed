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
export type Engine = MqttEngine | HttpEngine;

export type SpaceEngine = Extract<Engine, { spaceEngine: true }>;
export type ProceedEngine = Extract<Engine, { spaceEngine?: undefined }>;
