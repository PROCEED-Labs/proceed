// @ts-check
const NativeModule = require('@proceed/native-module');
const childProcess = require('node:child_process');

// TODO: implement queue

/**
 * @typedef {{
 *      processId: string,
 *      processInstanceId: string,
 *      scriptIdentifier: string,
 *      process: import('node:child_process').ChildProcess,
 *      token: string,
 *      stdout: string,
 *      stderr: string,
 *      sendToUniversal:  (error: any, response: any) => void,
 *      httpServerOpen: boolean
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

    this.commands = [
      'launch-child-process',
      'stop-child-process',
      'forward-request-to-child-process',
    ];

    /** @type{string} */
    this.id = require.resolve('@proceed/native-script-execution');

    /** @type{ ChildProcessEntry[]} */
    this.childProcesses = [];

    /** @type{Map<string, {
     *   respond: (error: any, response: any) => void,
     *   outstandingResponses: number,
     *   responses: any[],
     * }>} */
    this.outstandingRequests = new Map();

    this.options = options;
  }

  /**
   * @param {string} command
   * @param {any[]} args
   * @param { (error: any, response: any) => void} respond
   * */
  executeCommand(command, args, respond) {
    switch (command) {
      case 'launch-child-process':
        // @ts-ignore
        this.launchSubProcess(...args, respond);
        break;
      case 'stop-child-process':
        // @ts-ignore
        this.stopSubprocess(...args);
        break;
      case 'forward-request-to-child-process':
        // @ts-ignore
        this.forwardRequestToChildProcess(...args, respond);
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
    if (this.getProcess(processId, processInstanceId, scriptIdentifier).length > 0)
      throw new Error('This process is already executing a script');

    /** @type {ChildProcessEntry} */
    let processEntry;
    try {
      // TODO: don't hard code port
      const scriptTask = childProcess.spawn(
        'node',
        [
          require.resolve('./child-process/index.js'),
          processId,
          processInstanceId,
          scriptIdentifier,
          tokenId,
          scriptString,
          token,
          engineScriptExecutionEndpoint,
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        },
      );

      processEntry = {
        processId,
        processInstanceId,
        scriptIdentifier,
        process: scriptTask,
        sendToUniversal,
        token,
        stdout: '',
        stderr: '',
        httpServerOpen: false,
      };

      this.addProcess(processEntry);

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
        this.deleteProcess(processId, processInstanceId, scriptIdentifier);
      });

      scriptTask.on('message', (message) =>
        this.handleChildProcessIPC.bind(this)(message, processEntry),
      );
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
    else toStop = this.getProcess(processId, processInstanceId, scriptIdentifier);

    // NOTE: maybe give a warning?
    if (!toStop) return;

    for (const scriptTask of toStop) {
      if (!scriptTask.process.kill())
        throw new Error(`Failed to kill subprocess ${scriptTask.process.pid}`);
    }
  }

  /**
   * @param {string} processInstanceId
   * @param {any} request
   * @param { (error: any, response: any) => void} sendReply
   *
   */
  forwardRequestToChildProcess(processInstanceId, request, sendReply) {
    const processes = this.getProcess(undefined, processInstanceId, undefined);
    if (processes.length === 0) {
      return sendReply({
        statusCode: 404,
        response: 'No processes found',
      });
    }
    const requestId = crypto.randomUUID();
    let outstandingResponses = 0;

    // TODO: add timeout

    for (const process of processes) {
      if (!process.httpServerOpen) continue;

      outstandingResponses++;
      process.process.send({ type: 'http-request', id: requestId, request });
    }

    this.outstandingRequests.set(requestId, {
      outstandingResponses,
      respond: sendReply,
      responses: [],
    });
  }

  /**
   * @param {any} message
   * @param {ChildProcessEntry} processEntry
   */
  handleChildProcessIPC(message, processEntry) {
    // TODO: check message structure
    if (!message || typeof message !== 'object') return;

    if (message.type === 'open-http-server') {
      processEntry.httpServerOpen = true;
      return;
    }

    if (message.type !== 'http-request-response') return;

    const outstandingRequest = this.outstandingRequests.get(message.id);
    if (!outstandingRequest) return;

    outstandingRequest.outstandingResponses--;
    if (message.response.statusCode !== 404) {
      outstandingRequest.responses.push(message.response);
    }

    if (outstandingRequest.outstandingResponses > 0) return;

    // TODO: some better handling of this maybe??
    let response;
    if (outstandingRequest.responses.length === 0) {
      response = {
        statusCode: 404,
        response: 'No processes found',
      };
    } else if (outstandingRequest.responses.length === 1) {
      response = outstandingRequest.responses[0];
    } else {
      response = {
        statusCode: 200,
        response: { responses: outstandingRequest.responses },
      };
    }

    outstandingRequest.respond(undefined, [response]);
  }

  destroy() {
    this.stopSubprocess('*', '*');
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
   */
  getProcess(processId, processInstanceId, scriptIdentifier) {
    return this.childProcesses.filter((childProcess) => {
      if (processId && childProcess.processId !== processId) return false;
      if (processInstanceId && childProcess.processInstanceId !== processInstanceId) return false;
      if (scriptIdentifier && childProcess.scriptIdentifier !== scriptIdentifier) return false;
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

module.exports = SubprocesScriptExecution;
