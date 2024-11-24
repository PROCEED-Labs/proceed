// @ts-check
const { System } = require('./system');
const { generateUniqueTaskID } = require('./utils');

/**
 * @typedef {{
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
    /** @type{Map<
     *  string,
     *  Map<string, ChildProcessEntry>
     * >} */
    this.childProcesses = new Map();

    this.options = options;
  }

  /** @param {any} req  */
  routerMiddleware(req) {
    const { processId, processInstanceId, scriptIdentifier } = req.params;
    const process = this.getProcess(processId, processInstanceId, scriptIdentifier);
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
          return { response: { result } };
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
    try {
      const scriptIdentifier = crypto.randomUUID();
      const processEntry = {
        token: crypto.randomUUID(),
        dependencies,
      };
      this.setProcess(processId, processInstanceId, scriptIdentifier, processEntry);

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

          const processEntry = this.getProcess(processId, processInstanceId, scriptIdentifier);
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
   */
  stop(processId, processInstanceId) {
    if (processId === '*' && processInstanceId === '*') {
      this.commandRequest(generateUniqueTaskID(), ['stop-child-process', ['*', '*']]);
      return;
    }

    const scriptTask = this.getProcess(processId, processInstanceId);
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
   * @param {string} scriptIdentifier
   * @param {ChildProcessEntry} processEntry
   */
  setProcess(processId, processInstanceId, scriptIdentifier, processEntry) {
    const processIdentifier = JSON.stringify([processId, processInstanceId]);
    let processInstanceScripts = this.childProcesses.get(processIdentifier);

    if (!processInstanceScripts) {
      processInstanceScripts = new Map();
      this.childProcesses.set(processIdentifier, processInstanceScripts);
    }

    return processInstanceScripts.set(scriptIdentifier, processEntry);
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} [scriptIdentifier]
   */
  getProcess(processId, processInstanceId, scriptIdentifier) {
    const processScripts = this.childProcesses.get(JSON.stringify([processId, processInstanceId]));

    if (!processScripts) return undefined;
    else if (scriptIdentifier) return processScripts.get(scriptIdentifier);
    else return processScripts.values();
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} [scriptIdentifier]
   */
  deleteProcess(processId, processInstanceId, scriptIdentifier) {
    const scriptParams = JSON.stringify([processId, processInstanceId]);
    if (!scriptIdentifier) return this.childProcesses.delete(scriptParams);

    const processScripts = this.childProcesses.get(scriptParams);
    if (processScripts) return processScripts.delete(scriptIdentifier);
  }
}

module.exports = ScriptExecutor;
