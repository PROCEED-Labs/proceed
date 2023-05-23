import io from 'socket.io-client';
import { v4 } from 'uuid';
import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';
import { setProcessesListener } from '@/frontend/backend-api/ms-api-server/process.js';
import { setNetworkListener } from '@/frontend/backend-api/ms-api-server/network.js';
import { setDataListener } from '@/frontend/backend-api/ms-api-server/data.js';
import {
  setEngineListener,
  awaitEngineStart,
} from '@/frontend/backend-api/ms-api-server/engine.js';

export { io };

export const connectionId = v4();

let socket;
export async function connect() {
  socket = io(`https://${window.location.hostname}:33081`, {
    auth: {
      connectionId,
    },
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Client connected');
  });

  socket.on('disconnect', (reason) => {
    eventHandler.dispatch('connectionLost', { reason });
  });

  socket.io.on('reconnect', (attempt) => {
    eventHandler.dispatch('reconnected', { attempt });
  });

  setProcessesListener();
  setNetworkListener();
  setEngineListener();
  setDataListener();
  await awaitEngineStart();
}

/**
 * Function to emit one event to the server without response alignment (ids).
 * @param {string} event The name of the event
 * @param {any} data The (raw) data to send
 */
export function emit(event, ...data) {
  socket.emit(event, ...data);
}

/**
 * Function to receive events from the server without response alignment (ids).
 * @param {string} event The name of the event
 * @param {function} listener The listener function
 * @param {boolean} once Indicating if only one time listener
 */
export function listen(event, listener, once = false) {
  if (once) {
    socket.once(event, listener);
  } else {
    socket.on(event, listener);
  }
}

/**
 * Function to send and receive exactly one event. It takes care of the response
 * alignemnt using ids to match the async reponse from the server with the
 * initial request.
 * @param {string} event The name of the event
 * @param  {...any} data The (raw) data to send
 * @returns {Promise<any>} The response from the server
 */
export async function request(event, ...data) {
  return new Promise((resolve) => {
    const id = v4();
    // Listen for the answer
    function callback(_id, ..._data) {
      if (id === _id) {
        resolve(_data);
        // Remove this listener
        socket.removeEventListener(event, callback);
      }
    }
    socket.on(event, callback);
    socket.emit(event, id, ...data);
  });
}
