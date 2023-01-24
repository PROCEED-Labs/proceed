import engine from '../shared-electron-server/engine/index.js';
import logger from '../shared-electron-server/logging.js';

import eventHandler from '../../frontend/backend-api/event-system/EventHandler.js';

export function setupEngineRequestHandlers(addListener, broadcast) {
  addListener('engineConfig_set', async (socket, id, newConfig) => {
    logger.debug(`Request to update config of internal engine.`);
    socket.emit('engineConfig_set', id, await engine.setConfig(newConfig));
  });

  addListener('engineConfig_get', async (socket, id) => {
    logger.debug(`Request to get config of internal engine.`);
    socket.emit('engineConfig_get', id, await engine.getConfig());
  });

  addListener('engineStarted', async (socket, id) => {
    await engine.engineStarted;
    socket.emit('engineStarted', id);
    if (engine.isPublished()) {
      socket.emit('engine_published');
    } else {
      socket.emit('engine_unpublished');
    }
  });

  addListener('is_engine_published', async (socket, id) => {
    socket.emit('is_engine_published', id, engine.isPublished());
  });

  addListener('engine_unpublish', () => {
    logger.debug(`Request to unpublish the engine.`);
    engine.activateSilentMode();
  });

  addListener('engine_publish', () => {
    logger.debug(`Request to publish the engine in the local network.`);
    engine.deactivateSilentMode();
  });

  eventHandler.on('engineChangingState', () => {
    logger.debug(`Broadcasting to all clients that the internal engine is changing state.`);
    broadcast('engine_changing_state');
  });
  eventHandler.on('engineUnpublished', () => {
    logger.debug(`Broadcast unpublished state of internal engine.`);
    broadcast('engine_unpublished');
  });
  eventHandler.on('enginePublished', () => {
    logger.debug(`Broadcast published state of internal engine.`);
    broadcast('engine_published');
  });
}
