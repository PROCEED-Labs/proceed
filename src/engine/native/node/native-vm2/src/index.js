const NativeModule = require('@proceed/native-module');
const childProcess = require('node:child_process');

// TODO: implement queue

/**
 * @class
 */
class SubprocesScriptExecution extends NativeModule {
  /**
   * @param {{
   * logChildProcessOutput?: boolean
   * }} [options={}]
   * */
  constructor(options = {}) {
    super();

    this.commands = ['launch-child-process', 'stop-child-process'];

    /** @type{string} */
    this.id = require.resolve('@proceed/native-vm2');

    /** @type{Map<
     *  string,
     *  {
     *    process: import('node:child_process').ChildProcess,
     *    token: string,
     *    stdout: string,
     *    stderr: string,
     *    sendToUniversal:  (error: any, response: any) => void
     *  }
     * >} */
    this.childProcesses = new Map();

    this.options = options;
  }

  executeCommand(command, args, send) {
    switch (command) {
      case 'launch-child-process':
        this.launchSubProcess(...args, send);
        break;
      case 'stop-child-process':
        this.stopSubprocess(...args);
        break;
      default:
        break;
    }
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} tokenId
   * @param {string} scriptString
   * @param {token} token Token for communicating with universal part
   * @param { (error: any, response: any) => void} sendToUniversal
   *
   */
  launchSubProcess(
    processId,
    processInstanceId,
    tokenId,
    scriptString,
    token,
    engineScriptExecutionEndpoint,
    sendToUniversal,
  ) {
    // NOTE: maybe just warn
    if (this.#getProcess(processId, processInstanceId))
      throw new Error('This process is already executing a script');

    let processEntry;
    try {
      // TODO: don't hard code port
      const scriptTask = childProcess.spawn(`node`, [
        require.resolve('./childProcess.js'),
        processId,
        processInstanceId,
        tokenId,
        scriptString,
        token,
        engineScriptExecutionEndpoint,
      ]);

      processEntry = {
        process: scriptTask,
        sendToUniversal,
        token,
        stdout: '',
        stderr: '',
      };

      this.#setProcess(processId, processInstanceId, processEntry);

      scriptTask.stdout.on('data', (data) => {
        if (this.options.logChildProcessOutput) console.log(`stdout: ${data}`);
        processEntry.stdout += data.toString();
      });

      scriptTask.stderr.on('data', (data) => {
        if (this.options.logChildProcessOutput) console.error(`stderr: ${data}`);
        processEntry.stderr += data.toString();
      });

      scriptTask.on('close', (code) => {
        processEntry.sendToUniversal(undefined, [
          {
            type: 'process-finished',
            code,
          },
        ]);
      });
    } catch (e) {
      // TODO: use proper logger
      console.error('Failed to start subprocess', e);
      processEntry.sendToUniversal(undefined, [
        {
          type: 'process-finished',
          code: 1,
        },
      ]);
    }
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   */
  stopSubprocess(processId, processInstanceId) {
    // NOTE: mabybe the onClose function from a process should remove them from the map

    // required by the neo engine
    if (processId === '*' && processInstanceId === '*') {
      for (const scriptTask of this.#getAllProcesses()) {
        if (!scriptTask.process.kill())
          throw new Error(`Failed to kill subprocess ${process.process.pid}`);
      }
    }

    const scriptTask = this.#getProcess(processId, processInstanceId);

    // NOTE: maybe give a warning?
    if (!scriptTask) return;

    if (!scriptTask.process.kill())
      throw new Error(`Failed to kill subprocess ${process.process.pid}`);
    this.#deleteProcess(processId, processInstanceId);
  }

  destroy() {
    this.stopSubprocess('*', '*');
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
}

module.exports = SubprocesScriptExecution;
