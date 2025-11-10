// @ts-check
//
const { System } = require('./system');
const { generateUniqueTaskID } = require('./utils');
// @ts-ignore
const Console = require('./console.ts').default;

/**
 * @typedef {{
 *    processId: string,
 *    processInstanceId: string,
 *    tokenId: string,
 *    scriptIdentifier: string,
 *    token: string,
 *    result?: Object
 *    dependencies?: Object
 *  }} ChildProcessEntry
 */

/**
 * @class
 */
class ScriptExecutor extends System {
  /**
   * @param {{
   *  network: import('./network'),
   * }} [options]
   * */
  constructor(options) {
    super();
    /** @type{ChildProcessEntry[]} */
    this.childProcesses = [];

    this.options = options;
  }

  _getLogger() {
    if (!this.logger) {
      this.logger = Console._getLoggingModule().getLogger({ moduleName: 'SYSTEM' });
    }
    return this.logger;
  }

  /** @param {any} req  */
  routerMiddleware(req) {
    const { processId, processInstanceId, scriptIdentifier } = req.params;
    const [process] = this.getProcess(processId, processInstanceId, scriptIdentifier);
    if (!process) return { statusCode: 404, response: {} };

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return { statusCode: 401, response: {} };
    const token = auth.substring('Bearer '.length);
    // NOTE: a simple comparison may be vulnerable to a timing attack

    //@ts-ignore
    if (token !== process.token) return { statusCode: 401, response: {} };

    req.process = process;
  }

  /** @param {number} port */
  setupRouter(port) {
    this.httpPort = port;

    this.options.network.post(
      '/scriptexecution/:processId/:processInstanceId/:scriptIdentifier/result',
      {},
      async function (req) {
        const middlewareError = this.routerMiddleware.bind(this)(req);
        if (middlewareError) return middlewareError;

        if (req.headers['content-type'] !== 'application/json')
          return {
            response: { error: 'You have to send a JSON body that includes a result key.' },
            statusCode: 400,
          };

        let result = req.body ? req.body.result : undefined;

        try {
          if (
            typeof result === 'object' &&
            'errorClass' in result &&
            typeof result.errorClass === 'string'
          ) {
            if (result.errorClass === '_javascript_error') {
              const error = global[result.name];

              if ('prototype' in error && error.prototype instanceof Error) {
                const resultError = new error(error.message);
                resultError.message = result.message;
                if ('stack' in result) delete result.stack;

                result = resultError;
              }
            } else if (
              result.errorClass in req.process.dependencies &&
              typeof result.errorArgs === 'object' &&
              Array.isArray(result.errorArgs) &&
              (req.process.dependencies[result.errorClass].prototype instanceof Error ||
                req.process.dependencies[result.errorClass] === Error)
            ) {
              result = new req.process.dependencies[result.errorClass](result.errorArgs);
            }
          }
        } catch (e) {
          console.error(e);
        }

        req.process.result = result;

        return { statusCode: 200, response: {} };
      }.bind(this),
    );

    this.options.network.post(
      '/scriptexecution/:processId/:processInstanceId/:scriptIdentifier/call',
      {},
      async function (req) {
        const middlewareError = this.routerMiddleware.bind(this)(req);
        if (middlewareError) return middlewareError;

        const { functionName, args } = req.body;

        try {
          let target = req.process.dependencies;
          const segments = functionName.split('.');
          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (segments[i - 1] === 'getService') target = target(segment);
            else target = target[segment];

            if (typeof target === 'undefined')
              return { response: { error: 'Function not found' }, statusCode: 404 };
          }

          let result = target;
          if (typeof target === 'function' || typeof target === 'object')
            result = await target(...args);

          return { response: { result: result || undefined } };
        } catch (error) {
          let errorResponse = 'Unknown Error';
          if (error instanceof Error) {
            errorResponse = error.name + ' ' + error.message;
          } else {
            try {
              // If error is serializable we can send it back
              JSON.stringify(error);
              errorResponse = error;
            } catch (_) {}
          }

          this._getLogger().error(
            `Error in function call in script execution of processId: ${req.params.processId} processInstanceId: ${req.params.processInstanceId}: ${JSON.stringify(errorResponse)}`,
          );

          return { response: { error: errorResponse }, statusCode: 200 };
        }
      }.bind(this),
    );

    function forwardRequestToChildProcesses(instanceId, req) {
      const scriptTaskRequestId = generateUniqueTaskID();
      this.commandRequest(scriptTaskRequestId, [
        'forward-request-to-child-process',
        [instanceId, req],
      ]);

      return new Promise((resolve, reject) => {
        this.commandResponse(scriptTaskRequestId, (err, res) => {
          if (err) {
            // TODO: handle error
            return reject(err);
          }

          // TODO: check response
          resolve(res);
        });
      });
    }

    for (const method of ['post', 'put', 'get', 'delete']) {
      this.options.network[method](
        '/running-processes/:processId/latest/:pathForScriptTask(*)',
        {},
        async function (req) {
          const processes = this.getProcess(req.params.processId, undefined, undefined);
          if (processes.length === 0) {
            return {
              statusCode: 404,
              response: 'No processes found',
            };
          }

          req.path = '/' + req.path.split('/').splice(4).join('/');
          return forwardRequestToChildProcesses.bind(this)(processes.at(-1).processInstanceId, req);
        }.bind(this),
      );
      this.options.network[method](
        '/running-processes/:instanceId/:pathForScriptTask(*)',
        {},
        async function (req) {
          const processes = this.getProcess(undefined, req.params.instanceId, undefined);
          if (processes.length === 0) {
            return {
              statusCode: 404,
              response: 'No processes found',
            };
          }

          req.path = '/' + req.path.split('/').splice(3).join('/');
          return forwardRequestToChildProcesses.bind(this)(req.params.instanceId, req);
        }.bind(this),
      );
    }
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} tokenId
   * @param {string} scriptString
   * @param {Object} dependencies
   */
  execute(processId, processInstanceId, tokenId, scriptString, dependencies) {
    try {
      const scriptIdentifier = crypto.randomUUID();
      const processEntry = {
        processId,
        processInstanceId,
        tokenId,
        scriptIdentifier,
        token: crypto.randomUUID(),
        dependencies,
      };
      this.addProcess(processEntry);

      // inline global variables
      for (const key in dependencies) {
        if (typeof dependencies[key] !== 'object' && typeof dependencies[key] !== 'function') {
          scriptString = `const ${key} = ${JSON.stringify(dependencies[key])};\n` + scriptString;
        }
      }

      const subprocessLaunchReqId = generateUniqueTaskID();

      this.commandRequest(subprocessLaunchReqId, [
        'launch-child-process',
        [
          processId,
          processInstanceId,
          scriptIdentifier,
          tokenId,
          scriptString,
          processEntry.token,
          `http://localhost:${this.httpPort}/scriptexecution`,
        ],
      ]);

      return new Promise((res, rej) => {
        function responseCallback(error, response) {
          if (error) rej(error);

          // invalid response
          if (!response || typeof response !== 'object' || !('type' in response))
            rej(new Error('Invalid response from sub process module: ' + JSON.stringify(response)));

          const [processEntry] = this.getProcess(processId, processInstanceId, scriptIdentifier);
          if (!processEntry)
            rej(
              new Error(
                `Consistency error: got message for process ${processId} ${processInstanceId}, but this process has no execution entry`,
              ),
            );

          if (response.type === 'process-finished') {
            this.deleteProcess(processId, processInstanceId, scriptIdentifier);

            if (response.code === 0) res(processEntry.result);
            else rej(processEntry.result);
          }
        }

        this.commandResponse(subprocessLaunchReqId, responseCallback.bind(this));
      });
    } catch (e) {
      // These errors happened while setting up the execution, not whilst executing
      if (e instanceof Error) {
        e.message = `Failed to start subprocess: ${e.message}`;
      }

      throw e;
    }
  }

  // NOTE: should this be an async function that resolves when the process is stopped?
  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} [tokenId]
   */
  stop(processId, processInstanceId, tokenId) {
    if (processId === '*' && processInstanceId === '*') {
      this.commandRequest(generateUniqueTaskID(), ['stop-child-process', ['*', '*']]);
      return;
    }

    const scriptTask = this.getProcess(processId, processInstanceId, undefined, tokenId);
    if (scriptTask.length === 0) throw new Error('No running script task found');

    this.commandRequest(generateUniqueTaskID(), [
      'stop-child-process',
      [processId, processInstanceId, tokenId],
    ]);
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} [tokenId]
   */
  pause(processId, processInstanceId, tokenId) {
    try {
      this.commandRequest(generateUniqueTaskID(), [
        'pause-child-process',
        [processId, processInstanceId, tokenId],
      ]);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} [tokenId]
   */
  resume(processId, processInstanceId, tokenId) {
    this.commandRequest(generateUniqueTaskID(), [
      'resume-child-process',
      [processId, processInstanceId, tokenId],
    ]);
  }

  destroy() {
    this.stop('*', '*');
  }

  // ----------------------------------------
  // getters and setters
  // ----------------------------------------

  /** @param {ChildProcessEntry} processEntry */
  addProcess(processEntry) {
    this.childProcesses.push(processEntry);
  }

  /**
   * @param {string} [processId]
   * @param {string} [processInstanceId]
   * @param {string} [scriptIdentifier]
   * @param {string} [tokenId]
   */
  getProcess(processId, processInstanceId, scriptIdentifier, tokenId) {
    return this.childProcesses.filter((childProcess) => {
      if (processId && childProcess.processId !== processId) return false;
      if (processInstanceId && childProcess.processInstanceId !== processInstanceId) return false;
      if (scriptIdentifier && childProcess.scriptIdentifier !== scriptIdentifier) return false;
      if (tokenId && childProcess.tokenId !== tokenId) return false;
      return true;
    });
  }

  /** NOTE: Don't alter the returned array */
  getAllProcesses() {
    return this.childProcesses;
  }

  /**
   * @param {string} [processId]
   * @param {string} [processInstanceId]
   * @param {string} [scriptIdentifier]
   */
  deleteProcess(processId, processInstanceId, scriptIdentifier) {
    this.childProcesses = this.childProcesses.filter((childProcess) => {
      if (processId && childProcess.processId !== processId) return true;
      if (processInstanceId && childProcess.processInstanceId !== processInstanceId) return true;
      if (scriptIdentifier && childProcess.scriptIdentifier !== scriptIdentifier) return true;
      return false;
    });
  }

  deleteAllProcess() {
    this.childProcesses = [];
  }
}

module.exports = ScriptExecutor;
