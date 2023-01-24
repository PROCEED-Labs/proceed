import machineEx from '@proceed/machine';
const { config: engineConfigHandler } = machineEx;
import startEngine from './engine.js';
import eventHandler from '../../../frontend/backend-api/event-system/EventHandler.js';
import { getBackendConfig } from '../data/config.js';
import logger from '../logging.js';

let engine;

let engineStartedResolver;
let engineStarted = new Promise((resolve) => {
  engineStartedResolver = resolve;
});

let enginePublished = false;

async function initEngine() {
  engine = await startEngine(true);
  logger.info('Started internal engine!');

  if (getBackendConfig().startEngineAtStartup) {
    logger.debug('Will publish engine in consequence of startEngineAtStartup being set to true');
    await engine.deactivateSilentMode();
    enginePublished = true;
  }

  engineStartedResolver();
}

async function activateSilentMode() {
  if (engine) {
    eventHandler.dispatch('engineChangingState');

    await engine.activateSilentMode();

    enginePublished = false;
    eventHandler.dispatch('engineUnpublished');
  }
}

async function deactivateSilentMode() {
  if (engine) {
    eventHandler.dispatch('engineChangingState');
    await engine.deactivateSilentMode();
    enginePublished = true;
    eventHandler.dispatch('enginePublished');
  }
}

async function getConfig() {
  const config = await engineConfigHandler.config;
  return config;
}

async function setConfig(newConfig) {
  await engineConfigHandler.writeConfig(newConfig);
}

function isPublished() {
  return enginePublished;
}

initEngine();

export default {
  engineStarted,
  activateSilentMode,
  deactivateSilentMode,
  getConfig,
  setConfig,
  isPublished,
};
