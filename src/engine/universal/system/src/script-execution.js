const { System } = require('./system');
const { generateUniqueTaskID } = require('./utils');

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
    /** @type{Map<
     *  string,
     *  {
     *    token: string,
     *    result?: Object
     *    dependencies?: Object
     *  }
     * >} */
    this.childProcesses = new Map();

    this.options = options;
  }

  /** @param {number} port */
  setupRouter(port) {
    this.httpPort = port;

    function middleware(req) {
      const { processId, processInstanceId } = req.params;
      const process = this.#getProcess(processId, processInstanceId);
      if (!process) return { statusCode: 404, response: {} };

      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) return { statusCode: 401, response: {} };
      const token = auth.substring('Bearer '.length);
      // NOTE: a simple comparison may be vulnerable to a timing attack
      if (token !== process.token) return { statusCode: 401, response: {} };

      req.process = process;
    }

    this.options.network.post(
      '/scriptexecution/:processId/:processInstanceId/result',
      {},
      async function (req) {
        const middlewareError = middleware.bind(this)(req);
        if (middlewareError) return middlewareError;

        if (req.headers['content-type'] !== 'application/json')
          return {
            response: { error: 'You have to send a JSON body that includes a result key.' },
            statusCode: 400,
          };

        let result = req?.body.result;

        try {
          if (
            result &&
            result.errorClass in req.process.dependencies &&
            'errorClass' in result &&
            typeof result.errorClass === 'string' &&
            typeof result.errorArgs === 'object' &&
            'length' in result.errorArgs &&
            (req.process.dependencies[result.errorClass].prototype instanceof Error ||
              req.process.dependencies[result.errorClass] === Error)
          )
            result = new req.process.dependencies[result.errorClass](result.errorArgs);
        } catch (_) {}

        req.process.result = result;

        return { statusCode: 200, response: {} };
      }.bind(this),
    );

    this.options.network.post(
      '/scriptexecution/:processId/:processInstanceId/call',
      {},
      async function (req) {
        const middlewareError = middleware.bind(this)(req);
        if (middlewareError) return middlewareError;

        const { functionName, args } = req.body;

        try {
          let target = req.process?.dependencies;
          for (const segment of functionName.split('.')) {
            target = target[segment];

            if (typeof target === 'undefined')
              return { response: { error: 'Function not found' }, statusCode: 404 };
          }

          if (typeof target === 'function' || typeof target === 'object')
            return { response: { result: await target(...args) } };
          else return { response: { result: target } };
        } catch (e) {
          return { response: { error: `Error: ${e.message}` }, statusCode: 500 };
        }
      }.bind(this),
    );
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} tokenId
   * @param {string} scriptString
   * @param {Object} dependencies
   */
  execute(processId, processInstanceId, tokenId, scriptString, dependencies) {
    // NOTE: maybe just warn
    if (this.#getProcess(processId, processInstanceId))
      throw new Error('This process is already executing a script');

    try {
      const processEntry = {
        token: crypto.randomUUID(),
        dependencies,
      };
      this.#setProcess(processId, processInstanceId, processEntry);

      const subprocessLaunchReqId = generateUniqueTaskID();

      this.commandRequest(subprocessLaunchReqId, [
        'launch-child-process',
        [
          processId,
          processInstanceId,
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

          const processEntry = this.#getProcess(processId, processInstanceId);
          if (!processEntry)
            rej(
              new Error(
                `Consistency error: got message for process ${processId} ${processInstanceId}, but this process has no execution entry`,
              ),
            );

          if (response.type === 'process-finished') {
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
   */
  stop(processId, processInstanceId) {
    if (processId === '*' && processInstanceId === '*') {
      this.commandRequest(generateUniqueTaskID(), ['stop-child-process', ['*', '*']]);
      return;
    }

    const scriptTask = this.#getProcess(processId, processInstanceId);
    // NOTE: maybe give a warning?
    if (!scriptTask) return;

    this.commandRequest(generateUniqueTaskID(), [
      'stop-child-process',
      [processId, processInstanceId],
    ]);
  }

  destroy() {
    this.stop('*', '*');
  }

  // ----------------------------------------
  // getters and setters
  // ----------------------------------------

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {typeof this.childProcesses} processInstanceId
   */
  #setProcess(processId, processInstanceId, processEntry) {
    return this.childProcesses.set(JSON.stringify([processId, processInstanceId]), processEntry);
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   */
  #getProcess(processId, processInstanceId) {
    return this.childProcesses.get(JSON.stringify([processId, processInstanceId]));
  }
}

module.exports = ScriptExecutor;
