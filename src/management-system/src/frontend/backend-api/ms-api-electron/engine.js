import { ipcRenderer } from 'electron';
import backend from '@/backend/shared-electron-server/engine/index.js';
import eventHandler from '../event-system/EventHandler.js';

ipcRenderer.on('toggleSilentMode', () => {
  eventHandler.dispatch('toggleSilentMode');
});

backend.engineStarted.then(() => {
  if (backend.isPublished()) {
    ipcRenderer.send('engine-status', 'On');
  } else {
    ipcRenderer.send('engine-status', 'Off');
  }
});

async function activateSilentMode() {
  await backend.activateSilentMode();
  ipcRenderer.send('engine-status', 'Off');
}

async function deactivateSilentMode() {
  await backend.deactivateSilentMode();
  ipcRenderer.send('engine-status', 'On');
}

async function getConfig() {
  const config = await backend.getConfig();
  return config;
}

async function setConfig(newConfig) {
  await backend.setConfig(newConfig);
}

export default {
  activateSilentMode,
  deactivateSilentMode,
  getConfig,
  setConfig,
  isEnginePublished: backend.isPublished,
  engineStarted: backend.engineStarted,
};
