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
    this._http.get(path, options, wrapInFilterResponseMiddleware(callback));
    this._messaging.get(path, options, wrapInFilterResponseMiddleware(callback));
  }

  put(path, options, callback) {
    this._http.put(path, options, wrapInFilterResponseMiddleware(callback));
    this._messaging.put(path, options, wrapInFilterResponseMiddleware(callback));
  }

  post(path, options, callback) {
    this._http.post(path, options, wrapInFilterResponseMiddleware(callback));
    this._messaging.post(path, options, wrapInFilterResponseMiddleware(callback));
  }

  delete(path, options, callback) {
    this._http.delete(path, options, wrapInFilterResponseMiddleware(callback));
    this._messaging.delete(path, options, wrapInFilterResponseMiddleware(callback));
  }
}

module.exports = Network;
