// @ts-check
const NativeModule = require('@proceed/native-module');
const childProcess = require('node:child_process');

// TODO: implement queue

/**
 * @typedef {{
 *      process: import('node:child_process').ChildProcess,
 *      token: string,
 *      stdout: string,
 *      stderr: string,
 *      sendToUniversal:  (error: any, response: any) => void
 *    }} ChildProcessEntry
 */

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
     *  Map<string,
     *    ChildProcessEntry
     *  >
     * >} */
    this.childProcesses = new Map();

    this.options = options;
  }

  /**
   * @param {string} command
   * @param {any[]} args
   * @param { (error: any, response: any) => void} send
   * */
  executeCommand(command, args, send) {
    switch (command) {
      case 'launch-child-process':
        // @ts-ignore
        this.launchSubProcess(...args, send);
        break;
      case 'stop-child-process':
        // @ts-ignore
        this.stopSubprocess(...args);
        break;
      default:
        break;
    }
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} scriptIdentifier
   * @param {string} tokenId
   * @param {string} scriptString
   * @param {string} token Token for communicating with universal part
   * @param {string}  engineScriptExecutionEndpoint engine endpoint
   * @param { (error: any, response: any) => void} sendToUniversal
   *
   */
  launchSubProcess(
    processId,
    processInstanceId,
    scriptIdentifier,
    tokenId,
    scriptString,
    token,
    engineScriptExecutionEndpoint,
    sendToUniversal,
  ) {
    // NOTE: maybe just warn
    if (this.getProcess(processId, processInstanceId, scriptIdentifier))
      throw new Error('This process is already executing a script');

    let processEntry;
    try {
      // TODO: don't hard code port
      const scriptTask = childProcess.spawn(
        `node`,
        [
          require.resolve('./childProcess.js'),
          processId,
          processInstanceId,
          scriptIdentifier,
          tokenId,
          scriptString,
          token,
          engineScriptExecutionEndpoint,
        ],
        {},
      );

      processEntry = {
        process: scriptTask,
        sendToUniversal,
        token,
        stdout: '',
        stderr: '',
      };

      this.setProcess(processId, processInstanceId, scriptIdentifier, processEntry);

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
        this.deleteProcess(processId, processInstanceId);
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
   * @param {string} [scriptIdentifier]
   */
  stopSubprocess(processId, processInstanceId, scriptIdentifier) {
    /** @type {Iterable<ChildProcessEntry>} */
    let toStop;

    if (processId === '*' && processInstanceId === '*') toStop = this.getAllProcesses();
    // @ts-ignore
    else if (!scriptIdentifier) toStop = this.getProcess(processId, processInstanceId);
    // @ts-ignore
    else toStop = [this.getProcess(processId, processInstanceId, scriptIdentifier)];

    // NOTE: maybe give a warning?
    if (!toStop) return;

    for (const scriptTask of toStop) {
      if (!scriptTask.process.kill())
        throw new Error(`Failed to kill subprocess ${scriptTask.process.pid}`);
    }
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
    if (scriptIdentifier) return processScripts.get(scriptIdentifier);
    else return processScripts.values();
  }

  getAllProcesses() {
    return Array.from(this.childProcesses.values())
      .map((scriptInstances) => Array.from(scriptInstances.values()))
      .flat();
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   */
  deleteProcess(processId, processInstanceId) {
    return this.childProcesses.delete(JSON.stringify([processId, processInstanceId]));
  }

  deleteAllProcess() {
    this.childProcesses.clear();
  }
}

module.exports = SubprocesScriptExecution;
