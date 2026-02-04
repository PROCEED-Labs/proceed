type Discriminator = { spaceEngine?: undefined } | { spaceEngine: true };

export type MqttEngine = { type: 'mqtt'; id: string; brokerAddress: string } & Discriminator;
export type HttpEngine = { type: 'http'; id: string; address: string } & Discriminator;
export type Engine = MqttEngine | HttpEngine;

export type SpaceEngine = Extract<Engine, { spaceEngine: true }>;
export type ProceedEngine = Extract<Engine, { spaceEngine?: undefined }>;

export function isHttpEngine(engine: Engine): engine is HttpEngine {
  return engine.type === 'http';
}
export function isMqttEngine(engine: Engine): engine is MqttEngine {
  return engine.type === 'mqtt';
}
