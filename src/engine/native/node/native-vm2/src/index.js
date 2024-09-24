const NativeModule = require('@proceed/native-module');
const childProcess = require('node:child_process');
const Fastify = require('fastify');

/**
 * @class
 */
class ScriptExecutor extends NativeModule {
  /**
   * @param {{
   * processCommunicationPort?: number
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
    this.options.processCommunicationPort = options.processCommunicationPort ?? 33040;
    this.#setupRouter();
  }

  #setupRouter() {
    this.fastify = Fastify({
      logger: false,
    });

    this.fastify.post(
      '/:processId/:processInstanceId/result',
      {
        preHandler: this.#fastifyAuthMiddleware.bind(this),
      },
      (req, res) => {
        if (req.headers['content-type'] !== 'application/json')
          return res.code(400).send('You have to send a JSON body that includes a result key.');

        req.process.result = req?.body.result;
        return res.code(200).send();
      },
    );

    this.fastify.post(
      '/:processId/:processInstanceId/call',
      {
        schema: {
          body: {
            type: 'object',
            properties: {
              functionName: { type: 'string' },
              args: { type: 'array' },
            },
          },
        },
        preHandler: this.#fastifyAuthMiddleware.bind(this),
      },
      async (req, res) => {
        const { functionName, args } = req.body;

        try {
          let target = req.process?.dependencies;
          for (const segment of functionName.split('.')) {
            target = target[segment];

            if (typeof target === 'undefined') return res.code(404).send('Function not found');
          }

          if (typeof target === 'function' || typeof target === 'object')
            return res.code(200).send({ result: await target(...args) });
          else return res.code(200).send({ result: target });
        } catch (e) {
          return res.code(500).send(`Error: ${e.message}`);
        }
      },
    );

    this.fastify.listen({ port: this.options.processCommunicationPort });
  }

  #fastifyAuthMiddleware(req, res, done) {
    const { processId, processInstanceId } = req.params;
    const process = this.#getProcess(processId, processInstanceId);
    if (!process) return res.code(404).send();

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.code(401).send();
    const token = auth.substring('Bearer '.length);
    // NOTE: a simple comparison may be vulnerable to a timing attack
    if (token !== process.token) return res.code(401).send();

    req.process = process;

    done();
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
    // TODO: maybe just warn
    if (this.#getProcess(processId, processInstanceId))
      throw new Error('This process is already executing a script');

    try {
      const token = crypto.randomUUID();

      // TODO: make this an absolute path
      const scriptTask = childProcess.spawn(`node`, [
        require.resolve('./childProcess.js'),
        processId,
        processInstanceId,
        tokenId,
        scriptString,
        token,
        `http://localhost:${this.options.processCommunicationPort}`,
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
          // TODO: use code's output
          if (code === 0) resolve(processEntry.result);
          else reject();
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
    return this.fastify.close();
  }
}

module.exports = ScriptExecutor;
