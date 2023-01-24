import { listen, emit, request } from './socket.js';
import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';

export function setEngineListener() {
  listen('engine_changing_state', () => {
    eventHandler.dispatch('engineChangingState');
  });
  listen('engine_unpublished', () => {
    eventHandler.dispatch('engineUnpublished');
  });
  listen('engine_published', () => {
    eventHandler.dispatch('enginePublished');
  });
}
// react to events coming from server

async function activateSilentMode() {
  emit('engine_unpublish');
}

async function deactivateSilentMode() {
  emit('engine_publish');
}

async function getConfig() {
  const [config] = await request('engineConfig_get');
  return config;
}

async function setConfig(newConfig) {
  return request('engineConfig_set', newConfig);
}

let startedResolver;
const engineStarted = new Promise((resolve) => {
  startedResolver = resolve;
});

export async function awaitEngineStart() {
  await request('engineStarted');
  startedResolver();
}

async function isEnginePublished() {
  const [published] = await request('is_engine_published');
  return published;
}

//awaitEngineStart();

export default {
  activateSilentMode,
  deactivateSilentMode,
  getConfig,
  setConfig,
  isEnginePublished,
  engineStarted,
};
