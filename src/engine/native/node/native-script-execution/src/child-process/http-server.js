// @ts-check

const ivm = require('isolated-vm');
const { match } = require('path-to-regexp');

/** @typedef RouteEntry
 * @type {{
 *  match: import('path-to-regexp').MatchFunction<any>;
 *  resolvePromise?: (args: any) => void;
 * }}
 * */

/** @type {Record<string, Map<string, RouteEntry>>} */
let listeningOn = {
  post: new Map(),
  put: new Map(),
  delete: new Map(),
  get: new Map(),
  update: new Map(),
};

/**
 * @param {{
 *  context: import('isolated-vm').Context
 *  callToExecutor: (endpoint: string, body: any) => Promise<any>
 *  processId: string,
 *  processInstanceId: string,
 *  tokenId: string
 * }} data
 * */
module.exports = function setupNetworkServer({ context }) {
  let listenerAdded = false;
  async function ipcMessageHandler(message) {
    try {
      // TODO: check structure of message

      if (message.type !== 'http-request') return;

      const method = message.request.method.toLowerCase();
      const listeners = listeningOn[method];

      // Iterate through registered routes. If a route matches, execute its handler
      // within the isolate and then send the response.

      for (const [path, routeEntry] of listeners.entries()) {
        const routeMatch = routeEntry.match(message.request.path);
        if (!routeMatch) continue;

        message.request.params = routeMatch.params;

        try {
          if (routeEntry.resolvePromise) {
            routeEntry.resolvePromise(new ivm.ExternalCopy(message));
          } else {
            // NOTE: we just call one handler, maybe we should consider calling more than one
            await context.evalClosure(
              `return _processRequest("${method}", "${path}", $0.copy(), "${message.id}")`,
              [new ivm.ExternalCopy(message.request)],
              { result: { promise: true, externalCopy: true } },
            );
          }
        } catch (e) {
          process.send({
            type: 'http-request-response',
            id: message.id,
            response: {
              statusCode: 500,
              response: 'Error in script task.',
            },
          });
        }

        return;
      }

      // In case no listener was registered for the endpoint
      // NOTE: maybe throw an error in the universal endpoint handler
      process.send({
        type: 'http-request-response',
        id: message.id,
        response: {
          statusCode: 404,
          response: 'No processes found',
        },
      });
    } catch (e) {
      console.error('error handling IPC message', e);

      // NOTE: maybe throw an error in the universal endpoint handler
      process.send({
        type: 'http-request-response',
        id: message.id,
        response: {
          statusCode: 500,
          response: 'Internal error',
        },
      });
    }
  }

  // --------------------------------------------------
  // Functions that will be defined inside the isolate
  // --------------------------------------------------

  class _Response {
    constructor(requestId) {
      this.requestId = requestId;
      this.statusCode = 200;
      this.sent = false;
    }

    status(code) {
      if (!Number.isInteger(code) || code < 100 || code > 999) {
        throw new TypeError('Invalid status, it must be a string between 100 and 999');
      }

      this.statusCode = code;
      return this;
    }

    send(body) {
      if (this.sent) {
        throw new Error('Response was already sent');
      }

      $sendResponse.apply(null, [this.requestId, JSON.stringify(body)]);
      this.sent = true;
    }
  }

  /**
   * @param {{
   * method: "post" | "put" | "delete" | "get" | "update";
   * path: string;
   * callback?: (arg: {res: any, req: any}) => void;
   * returnPromise?: boolean;
   * }}
   */
  function _registerListener({ method, path, callback, returnPromise }) {
    if (_httpServerListeners[method].get(path)) {
      throw new Error('This path already was registered');
    }

    _httpServerListeners[method].set(path, callback);

    if (callback) {
      $registerRouteWithCallback.apply(null, [method, path]);
      return;
    }

    _oneOffRoutesPending++;

    if (!returnPromise) {
      const result = $registerRouteWithoutCallback.applySyncPromise(null, [method, path]);
      return _oneOffListener(method, path, result);
    } else {
      return $registerRouteWithoutCallback
        .apply(null, [method, path], { result: { promise: true } })
        .then((result) => _oneOffListener(method, path, result));
    }
  }

  /** @param {import('isolated-vm').ExternalCopy<{ request: any, id: string}>} result */
  function _oneOffListener(method, path, result) {
    $removeRoute.applySync(null, [method, path]);
    _httpServerListeners[method].delete(path);

    // Close server if there are no other listeners
    let otherListeners = false;
    for (const method of ['post', 'put', 'delete', 'get', 'update']) {
      if (_httpServerListeners[method].size > 0) {
        otherListeners = true;
        break;
      }
    }

    _oneOffRoutesPending--;

    if (!otherListeners) {
      _networkServerCall('close');
    }

    const { request, id } = result.copy();
    const res = new _Response(id);
    return { req: request, res };
  }

  /**
   * This function will be called from the main process to trigger a callback inside the isolate
   *
   * @param {"post" | "put" | "delete" | "get" | "update" } method
   * @param {string} path
   * @param {import('isolated-vm').ExternalCopy} req
   * @param {number} requestId
   * */
  async function _processRequest(method, path, req, requestId) {
    let callback = _httpServerListeners[method].get(path);
    if (!callback) {
      return { result: 404 };
    }

    const res = new _Response(requestId);
    await callback({ req, res });
  }

  // This function is supposed to be accessed through getService('network-server') defined in ./service-calls.js
  function _networkServerCall(method, args) {
    if (['post', 'put', 'delete', 'get', 'update'].includes(method)) {
      return _registerListener({ method, path: args[0], callback: args[1] });
    }

    if (['postAsync', 'putAsync', 'deleteAsync', 'getAsync', 'updateAsync'].includes(method)) {
      return _registerListener({
        method: method.substring(0, method.length - 5),
        path: args[0],
        callback: undefined,
        returnPromise: true,
      });
    }

    if (method === 'close') {
      if (_oneOffRoutesPending > 0) {
        // NOTE: Throwing this error won't stop execution because it probably will be called from ipcMessageHandler.
        // This probably needs a better way of handling it
        throw new Error("There are one-off routes that still haven't been resolved");
      }

      for (const method of ['post', 'put', 'delete', 'get', 'update']) {
        for (const path of _httpServerListeners[method].values()) {
          $removeRoute.applySync(null, [method, path]);
          _httpServerListeners[method].delete(path);
        }
      }

      return $removeIPCListener.applySync(null, []);
    }
  }

  context.evalClosureSync(
    `
    let _oneOffRoutesPending = 0;
    let _httpServerListeners = {
      post: new Map(),
      put: new Map(),
      delete: new Map(),
      get: new Map(),
      update: new Map(),
    };
    ${_networkServerCall.toString()}; globalThis['_networkServerCall'] = _networkServerCall;
    ${_processRequest.toString()}; globalThis['_processRequest'] = _processRequest;
    ${_registerListener.toString()}
    ${_Response.toString()}
    ${_oneOffListener.toString()}
    const $registerRouteWithCallback = $0;
    const $registerRouteWithoutCallback = $1;
    const $removeRoute = $2;
    const $removeIPCListener = $3;
    const $sendResponse = $4;
    `,
    [
      new ivm.Reference((method, path) => {
        listeningOn[method].set(path, { match: match(path) });
        if (!listenerAdded) {
          listenerAdded = true;
          process.on('message', ipcMessageHandler);
          process.send({ type: 'open-http-server' });
        }
      }),
      new ivm.Reference((method, path) => {
        if (!listenerAdded) {
          listenerAdded = true;
          process.on('message', ipcMessageHandler);
          process.send({ type: 'open-http-server' });
        }

        return new Promise((resolve) => {
          listeningOn[method].set(path, {
            resolvePromise: resolve,
            match: match(path),
          });
        });
      }),
      new ivm.Reference((method, path) => {
        listeningOn[method].delete(path);
      }),
      new ivm.Reference(() => {
        // If this listener isn't removed, the childProcess will not end after the evaluation of
        // the script task is done, this gives us the effect that the script task will remain open,
        // until the server is closed
        if (listenerAdded) {
          process.removeListener('message', ipcMessageHandler);
          listenerAdded = false;
        }
      }),
      new ivm.Reference((id, response) => {
        process.send({
          type: 'http-request-response',
          id,
          response: JSON.parse(response),
        });
      }),
    ],
  );
};
