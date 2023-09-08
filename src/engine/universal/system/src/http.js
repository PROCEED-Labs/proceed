/* eslint-disable class-methods-use-this */
const { System } = require('./system.ts');
const { generateUniqueTaskID } = require('./utils.ts');
const Console = require('./console.ts').default;
const Config = require('./config.ts').default;
const timer = new (require('./timer.ts').default)();

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class HTTP extends System {
  constructor(env) {
    super(env);
    this.environment = env;
  }

  _getLogger() {
    if (!this.logger) {
      this.logger = Console._getLoggingModule().getLogger({ moduleName: 'SYSTEM' });
    }
    return this.logger;
  }

  /**
   * Set the port on the native part for the communication module.
   * @param {number} port The port to use
   */
  setPort(port) {
    const taskID = generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response
      this.commandResponse(taskID, (err, data) => {
        // Resolve or reject the promise
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }

        return true;
      });
    });

    // Emit the task
    this.commandRequest(taskID, ['setPort', [port]]);

    return listenPromise;
  }

  unsetPort() {
    const taskID = generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response
      this.commandResponse(taskID, (err, data) => {
        // Resolve or reject the promise
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }

        return true;
      });
    });

    // Emit the task
    this.commandRequest(taskID, ['unsetPort', []]);

    return listenPromise;
  }

  /**
   * Send a task to open the server for the given path.
   * @private
   * @param {string} method The HTTP method to listen on
   * @param {string} path The path (relative to root)
   * @param {object|null} options The options for the server
   * @param {boolean} options.cors Whether or not CORS should be enabled
   * @param {Function} callback The async callback function
   */
  async _serve(method, path, options, callback) {
    // options are optional
    let [opt, cb] = [options, callback];
    if (typeof options === 'function') {
      cb = options;
      opt = {};
    }

    // Prepare callback
    const taskID = generateUniqueTaskID();
    this.commandResponse(taskID, async (_, resID, req) => {
      // Process the request with the given callback
      let statusCode = 200;

      let bodyPeek;
      if (req.body) {
        const bodyContent = JSON.stringify(req.body);
        bodyPeek = bodyContent.length < 20 ? bodyContent : `${bodyContent.substr(0, 20)}...`;
      }

      // log information about the received request
      const bodyInfo = bodyPeek ? `body: ${bodyPeek}` : 'no body';
      const params = JSON.stringify(req.params);
      const query = JSON.stringify(req.query);
      const senderIp = req.ip.substr(req.ip.lastIndexOf(':') + 1);
      this._getLogger().trace(
        `Received ${req.method} on '${req.path}' from ${senderIp} with params: ${params}, query: ${query} and ${bodyInfo}`,
      );
      this._getLogger().trace(`Received ${req.method} request: ${JSON.stringify(req)}`);

      /**
       * Callback
       */
      const ret = await cb(req).catch((err) => {
        this._getLogger().error(`HTTP 404: ${err.message}`);
        return {
          response: err.message,
          mimeType: 'html',
          statusCode: err.statusCode || 404,
        };
      });

      // `ret` is either an object or just the sendResponse string
      let sendResponse = ret;
      let mimeType;
      if (typeof ret === 'object') {
        sendResponse = ret.response;
        ({ mimeType } = ret);
        statusCode = ret.statusCode || 200;
      }

      // Send the response back
      const resTaskID = generateUniqueTaskID();
      this.commandRequest(resTaskID, ['respond', [sendResponse, resID, statusCode, mimeType]]);
    });

    // Emit the task
    this.commandRequest(taskID, ['serve', [method, path, opt]]);
  }

  /**
   * Send a task to open the server for GET requests on the given path.
   * @param {string} path The path (relative to root)
   * @param {object|null} options The options for the server
   * @param {Function} callback The async callback function
   */
  get(path, options, callback) {
    this._serve('get', path, options, callback);
  }

  /**
   * Send a task to open the server for PUT requests on the given path.
   * @param {string} path The path (relative to root)
   * @param {object|null} options The options for the server
   * @param {Function} callback The async callback function
   */
  put(path, options, callback) {
    this._serve('put', path, options, callback);
  }

  /**
   * Send a task to open the server for POST requests on the given path.
   * @param {string} path The path (relative to root)
   * @param {object|null} options The options for the server
   * @param {Function} callback The async callback function
   */
  post(path, options, callback) {
    this._serve('post', path, options, callback);
  }

  /**
   * Send a task to open the server for DELETE requests on the given path.
   * @param {string} path The path (relative to root)
   * @param {object|null} options The options for the server
   * @param {Function} callback The async callback function
   */
  delete(path, options, callback) {
    this._serve('delete', path, options, callback);
  }

  /**
   * Easy NodeJS http request package on all platforms.
   * This method is not using the dispatcher to send the
   * task to the underlying system but instead is using the
   * request means that are available on this platform.
   * @param {string} url The URL for the http request call
   * @param {object|null} options The options for the request
   */
  async request(url, options, callback, preferNode) {
    if (typeof options === 'boolean') {
      /* eslint-disable no-param-reassign */
      preferNode = options;
      options = {};
    } else if (!options) {
      options = {};
    } else if (typeof options === 'function') {
      callback = options;
      preferNode = callback;
      options = {};
    } else if (typeof callback === 'boolean') {
      preferNode = callback;
      callback = undefined;
    }

    const timeout = await Config._getConfigModule().readConfig('engine.networkRequestTimeout');
    const result = new Promise((resolve, reject) => {
      timer.setTimeout(() => {
        reject('Request timed out (set by `engine.networkRequestTimeout`).');
      }, timeout * 1000);

      if (options.body !== undefined) {
        if (typeof options.body === 'object') {
          options.body = JSON.stringify(options.body);
          options.headers = {
            ...options.headers,
            'Content-Type': 'application/json',
          };
        }
        options.headers = {
          ...options.headers,
          'Content-Length': this.calcBodyLength(options.body),
        };
      }

      // Make the request
      let request;
      // In electron, we have both node's require and XMLHttpRequest, but only the
      // latter shows up in the Network panel in the dev tools so we prefer that.
      // except for request that might try to connect to unreachable engines to avoid errors in V8
      if (this.environment === 'web' || (!preferNode && typeof XMLHttpRequest !== 'undefined')) {
        request = require('browser-request');

        options.uri = url;

        if (options.headers) {
          delete options.headers['Content-Length'];
        }
        try {
          // 'options' contains everything: method, body, etc.
          request(options, (err, response, body) => {
            if (err || response.statusCode < 200 || response.statusCode >= 300) {
              reject(err || { response, body });
            } else {
              resolve({ response, body });
            }
          });
        } catch (err) {
          this._getLogger.info(`Error sending request: ${err}`);
          reject(err);
        }
      } else if (this.environment === 'node') {
        // Use node's native require if built with webpack
        // eslint-disable-next-line no-undef
        const _req = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require;
        if (url.startsWith('https')) {
          ({ request } = _req('https'));
        } else {
          ({ request } = _req('http'));
        }

        const urlP = _req('url');
        options = { ...options, ...urlP.parse(url) };
        const req = request(options, (response) => {
          response.setEncoding(options.encoding || 'utf8');
          let body = '';
          response.on('data', (chunk) => {
            body += chunk;
          });
          response.on('end', () => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject({ response, body });
            } else {
              resolve({ response, body });
            }
          });
        });
        req.on('error', (err) => reject(err));
        if (options && options.body) {
          req.write(options.body);
        }
        req.end();
      }
    });

    if (callback) {
      result
        .then((resultObj) => callback(null, resultObj.response, resultObj.body))
        .catch((err) => callback(err, null, null));
    } else {
      return result;
    }
  }

  /**
   * Calculates the length of the request body
   *
   * @param {string} data
   * @returns {number} body length
   */
  calcBodyLength(data) {
    let length;
    // Buffer in NodeJS or TextEncoder in browser
    if (typeof Buffer !== 'undefined') {
      // eslint-disable-next-line no-undef
      length = Buffer.byteLength(data);
    } else if (typeof TextEncoder !== 'undefined') {
      // eslint-disable-next-line no-undef
      ({ length } = new TextEncoder('utf-8').encode(data));
    }

    return length;
  }
}

module.exports = HTTP;
