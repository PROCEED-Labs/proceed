// @ts-check

const ivm = require('isolated-vm');
const { match } = require('path-to-regexp');

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
      /** @type {Map<string, import('path-to-regexp').MatchFunction<any> >}*/
      const listeners = listeningOn[method];

      // Iterate through registered routes. If a route matches, execute its handler
      // within the isolate and then send the response.

      for (const [path, match] of listeners.entries()) {
        const routeMatch = match(message.request.path);
        if (!routeMatch) continue;

        message.request.params = routeMatch.params;

        try {
          // NOTE: we just call one handler, maybe we should consider calling more than one
          await context.evalClosure(
            `return _processRequest("${method}", "${path}", $0.copy(), "${message.id}")`,
            [new ivm.ExternalCopy(message.request)],
            { result: { promise: true, externalCopy: true } },
          );
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

  /**
   * @param {"post" | "put" | "delete" | "get" | "update" } method
   * @param {string} path
   * */
  function _registerListener(method, path, callback) {
    if (_httpServerListeners[method].get(path)) {
      throw new Error('This path already was registered');
    }

    _httpServerListeners[method].set(path, callback);

    $0.apply(null, [method, path]);
  }

  /**
   * @param {"post" | "put" | "delete" | "get" | "update" } method
   * @param {string} path
   * @param {import('isolated-vm').ExternalCopy} request
   * @param {number} requestId
   * */
  async function _processRequest(method, path, request, requestId) {
    let callback = _httpServerListeners[method].get(path);
    if (!callback) {
      return { result: 404 };
    }

    const response = new _Response(requestId);
    await callback(request, response);
  }

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

      console.log('sending', body);
      $3.apply(null, [this.requestId, JSON.stringify(body)]);
      this.sent = true;
    }
  }

  // This function is supposed to be accessed through getService('network-server') defined in ./service-calls.js
  async function _networkServerCall(method, args) {
    if (['post', 'put', 'delete', 'get', 'update'].includes(method)) {
      return _registerListener(method, ...args);
    }

    if (method === 'close') {
      return $2.applySync(null, []);
    }
  }

  context.evalClosureSync(
    `
    let _httpServerListeners = {
      post: new Map(),
      put: new Map(),
      delete: new Map(),
      get: new Map(),
      update: new Map(),
    };
    ${_registerListener.toString()}; globalThis['_registerListener'] = _registerListener;
    ${_processRequest.toString()}; globalThis['_processRequest'] = _processRequest;
    ${_networkServerCall.toString()}; globalThis['_networkServerCall'] = _networkServerCall;
    ${_Response.toString()}; globalThis['_Response'] = _Response;
    `,
    [
      new ivm.Reference((method, path) => {
        listeningOn[method].set(path, match(path));
        if (!listenerAdded) {
          listenerAdded = true;
          process.on('message', ipcMessageHandler);
          process.send({ type: 'open-http-server' });
        }
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
