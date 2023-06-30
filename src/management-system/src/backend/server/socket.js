import eventHandler from '../../frontend/backend-api/event-system/EventHandler.js';
import logger from '../shared-electron-server/logging.js';

import { setupDataRequestHandlers } from './data.js';
import { setupEngineRequestHandlers } from './engine.js';
import { setupNetworkRequestHandlers } from './network.js';
import { setupMachineInfoRequestHandlers } from './machineInfo.js';
import { setupProcessRequestHandlers } from './process.js';
import { setup5thIndustryHandlers } from './5thIndustry.js';
import { setupDeploymentInfoRequestHandlers } from './deployment.js';
import ports from '../../../ports.js';
import { isOriginTrusted } from './iam/utils/utils.js';

import { enable5thIndustryIntegration } from '../../../../../FeatureFlags.js';

import __dirname from './dirname-node.js';
import { Server as IO } from 'socket.io';

let io;

export function broadcast(event, ...data) {
  if (!io) {
    throw new Error('Called broadcast function before starting the websocket server!');
  }

  io.sockets.emit(event, ...data);
}

export function startWebsocketServer(httpsServerObject, loginSession, config) {
  const listeners = {};

  io = new IO(httpsServerObject, {
    serveClient: false,
    cors: {
      origin: (origin, callback) => {
        callback(null, isOriginTrusted(origin));
      },
      credentials: true,
    },
  });

  // Keep for now, because not 100% sure if it will be necessary
  // io.engine.on('headers', (headers) => {
  //   headers['Access-Control-Allow-Origin'] = config.trustedOrigins.join(' ');
  //   //headers['Access-Control-Allow-Methods'] = 'PUT, GET, POST, DELETE, OPTIONS';
  // });

  if (loginSession) {
    const wrapper = (middleware) => (socket, next) => middleware(socket.request, {}, next);
    io.use(wrapper(loginSession));
  }

  io.on('connection', (socket) => {
    logger.info(
      `User ${socket.id} connected. Time: ${socket.handshake.time}, Address: ${socket.handshake.address}, Secure: ${socket.handshake.secure}, URL: ${socket.handshake.url}, Auth: ${socket.handshake.auth}`
    );

    Object.entries(listeners).forEach(([event, listener]) => {
      socket.on(event, (...args) => listener(socket, ...args));
    });

    socket.on('disconnect', () => {
      logger.info(`User ${socket.id} disconnected.`);
      eventHandler.dispatch('client_disconnected', socket);
    });
  });

  function addListener(event, listener) {
    if (listeners[event] !== undefined) {
      console.warn('Attempted to overwrite an already set event listener: ', event);
      process.exit(1);
    }

    listeners[event] = listener;
  }

  function sendCommand(socket, event, ...data) {
    return new Promise((resolve) => {
      socket.emit(event, data, (...response) => {
        resolve(response);
      });
    });
  }

  setupDataRequestHandlers(addListener, broadcast);
  setupEngineRequestHandlers(addListener, broadcast);
  setupNetworkRequestHandlers(addListener);
  setupMachineInfoRequestHandlers(addListener);
  setupProcessRequestHandlers(addListener, broadcast, sendCommand, io);
  if (enable5thIndustryIntegration) {
    setup5thIndustryHandlers(addListener);
  }
  setupDeploymentInfoRequestHandlers(io);

  httpsServerObject.listen(ports.websocket, () => {
    logger.info(`MS HTTPS Websocket server started on port ${ports.websocket}.`);
  });
}
