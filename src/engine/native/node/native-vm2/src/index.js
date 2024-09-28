const NativeModule = require('@proceed/native-module');
const childProcess = require('node:child_process');
// NOTE: native code directly calling universal code, I think the IPC communication should be done
// by hand in this part
const { network } = require('@proceed/system');

/**
 * @class
 */
class ScriptExecutor extends NativeModule {
  /**
   * @param {{
   * logChildProcessOutput?: boolean
   * }} [options={}]
   * */
  constructor(options = {}) {
    super();

    /** @type{string} */
    this.id = require.resolve('@proceed/native-vm2');

    /** @type{Map<
     *  string,
     *  {
     *    process: import('node:child_process').ChildProcess,
     *    token: string,
     *    stdout: string,
     *    stderr: string,
     *    result?: Object
     *    dependencies?: Object
     *  }
     * >} */
    this.childProcesses = new Map();

    this.options = options;
  }

  #setupRouter() {
    if (this.routerIsSetup) return;
    this.routerIsSetup = true;

    network.post(
      '/scriptexecution/:processId/:processInstanceId/result',
      {},
      async function (req) {
        const middlewareError = this.#requestMiddleware(req);
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

    network.post(
      '/scriptexecution/:processId/:processInstanceId/call',
      {},
      async function (req) {
        const middlewareError = this.#requestMiddleware(req);
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

  #requestMiddleware(req) {
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

  #getAllProcesses() {
    return this.childProcesses.values();
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   */
  #deleteProcess(processId, processInstanceId) {
    return this.childProcesses.delete(JSON.stringify([processId, processInstanceId]));
  }

  #deleteAllProcess() {
    this.childProcesses.clear();
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} tokenId
   * @param {string} scriptString
   * @param {Object} scriptString
   */
  execute(processId, processInstanceId, tokenId, scriptString, dependencies) {
    // TODO: find a better way to initialize the router
    this.#setupRouter();

    // TODO: maybe just warn
    if (this.#getProcess(processId, processInstanceId))
      throw new Error('This process is already executing a script');

    try {
      const token = crypto.randomUUID();

      // TODO: don't hard code port
      const scriptTask = childProcess.spawn(`node`, [
        require.resolve('./childProcess.js'),
        processId,
        processInstanceId,
        tokenId,
        scriptString,
        token,
        `http://localhost:33029`,
      ]);

      const processEntry = {
        process: scriptTask,
        token,
        dependencies,
        stdout: '',
        stderr: '',
      };
      this.#setProcess(processId, processInstanceId, processEntry);

      // TODO: handle script failure properly

      scriptTask.stdout.on('data', (data) => {
        if (this.options.logChildProcessOutput) console.log(`stdout: ${data}`);
        processEntry.stdout += data.toString();
      });

      scriptTask.stderr.on('data', (data) => {
        if (this.options.logChildProcessOutput) console.error(`stderr: ${data}`);
        processEntry.stderr += data.toString();
      });

      return new Promise((resolve, reject) => {
        scriptTask.on('close', (code) => {
          if (code === 0) resolve(processEntry.result);
          else reject(processEntry.result);
        });
      });
    } catch (e) {
      // TODO: use proper logger
    }
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   */
  stop(processId, processInstanceId) {
    // NOTE: mabybe the onClose function from a process should remove them from the map

    // required by the neo engine
    if (processId === '*' && processInstanceId === '*') {
      for (const process of this.#getAllProcesses()) {
        process.kill();
      }

      return this.#deleteAllProcess();
    }

    const scriptTask = this.#getProcess(processId, processInstanceId);

    // NOTE: maybe give a warning?
    if (!scriptTask) return;

    scriptTask.process.kill();
    this.#deleteProcess(processId, processInstanceId);
  }

  // /** @param {import('@proceed/core/src/engine/engine').default} engine  */
  onAfterEngineLoaded(engine) {
    engine.provideScriptExecutor(this);
    this.id;
  }

  destroy() {
    this.#deleteAllProcess();
  }
}

module.exports = ScriptExecutor;
