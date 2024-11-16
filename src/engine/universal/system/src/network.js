const HTTP = require('./http');

const { wrapInFilterResponseMiddleware } = require('./middleware');

/**
 * @memberof module:@proceed/system
 * @class
 *
 * Abstraction layer for communication with other machines
 *
 * user mustn't need to know what kind of communication method is used
 * @hideconstructor
 */
class Network {
  // create instances of
  constructor(env, messaging) {
    this._http = new HTTP(env);
    this.environment = env;
    this._messaging = messaging;
    this._callbacks = {
      get: new Map(),
      put: new Map(),
      post: new Map(),
      delete: new Map(),
    };
  }

  /**
   * Sends a request to another machine with the given ip and port values
   * @param {string} ip ip of the engine the request is to be send to
   * @param {number} port port of the engine the request is to be send to
   * @param {string} endpoint endpoint for the request
   * @param {object|null} options options for the request
   * @param {boolean} preferNode overwrite to enforce usage of nodes http module
   */
  async sendRequest(ip, port, endpoint, options, preferNode) {
    if (typeof options === 'boolean') {
      /* eslint-disable no-param-reassign */
      preferNode = options;
      options = undefined;
    }

    // ip param is url, this also covers https
    let url = ip + endpoint;

    if (port) {
      url = `http://${ip}:${port}${endpoint}`;
    }

    return this._http.request(url, options || {}, preferNode);
  }

  /**
   * Send data to another machine
   * @param {string} ip address of the engine the data is to be send to
   * @param {number} port port of the engine the data is to be send to
   * @param {string} endpoint endpoint the data is to be send to
   * @param {string} method REST method that has to be used (e.g 'PUT' or 'POST')
   * @param {string} type mime-type of the data that is to be send
   * @param {object} data data that has to be send
   * @param {Object} [additionalHeaders] additional headers to use in the request
   */
  async sendData(ip, port, endpoint, method, type, data, additionalHeaders = {}) {
    return this.sendRequest(ip, port, endpoint, {
      method,
      body: data,
      headers: {
        'Content-Type': type,
        ...additionalHeaders,
      },
    });
  }

  setPort(port) {
    this._http.setPort(port);
  }

  unsetPort() {
    this._http.unsetPort();
  }

  get(path, options, callback) {
    const wrappedCallback = wrapInFilterResponseMiddleware(callback);
    this._callbacks.get.set(path, wrappedCallback);
    this._http.get(path, options, wrappedCallback);
    this._messaging.get(path, options, wrappedCallback);
  }

  put(path, options, callback) {
    const wrappedCallback = wrapInFilterResponseMiddleware(callback);
    this._callbacks.get.set(path, wrappedCallback);
    this._http.put(path, options, wrappedCallback);
    this._messaging.put(path, options, wrappedCallback);
  }

  post(path, options, callback) {
    const wrappedCallback = wrapInFilterResponseMiddleware(callback);
    this._callbacks.post.set(path, wrappedCallback);
    this._http.post(path, options, wrappedCallback);
    this._messaging.post(path, options, wrappedCallback);
  }

  delete(path, options, callback) {
    const wrappedCallback = wrapInFilterResponseMiddleware(callback);
    this._callbacks.delete.set(path, wrappedCallback);
    this._http.delete(path, options, wrappedCallback);
    this._messaging.delete(path, options, wrappedCallback);
  }

  /**
    * Call endpoints from within the engine
    *
    * @param {string} method The method to use for the request
    * @param {string} path The path to the endpoint
    * @param {{
        hostname?: string;
        ip?: string;
        method?: string;
        params?: any;
        query?: any;
        path?: string;
        body?: any;
        files?: any;
      }} reqObject The request object to pass to the endpoint
    * @throws {Error} If the method isn't supported, if no callback is registered for the path, or
    * if the callback for the path throws an error
    */
  async loopback(method, path, reqObject) {
    if (!(method in this._callbacks)) throw new Error(`Method ${method} not supported`);

    const alternatePath = path.endsWith('/') ? path.slice(0, -1) : `${path}/`;
    const callback =
      this._callbacks[method].get(path) || this._callbacks[method].get(alternatePath);
    if (!callback) throw new Error(`No callback registered for path ${path}`);

    if (!reqObject) reqObject = {};
    if (!('query' in reqObject)) reqObject.query = {};
    if (!('method' in reqObject)) reqObject.method = method.toUpperCase();
    if (!('path' in reqObject)) reqObject.path = path;

    return await callback(reqObject);
  }
}

module.exports = Network;
