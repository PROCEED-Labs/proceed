// @ts-check
const NativeModule = require('@proceed/native-module');
const childProcess = require('node:child_process');

// TODO: implement queue

/**
 * @typedef {{
 *      processId: string,
 *      processInstanceId: string,
 *      tokenId: string,
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
      'pause-child-process',
      'resume-child-process',
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
      case 'pause-child-process':
        // @ts-ignore
        this.pauseSubprocess(...args);
        break;
      case 'resume-child-process':
        // @ts-ignore
        this.resumeSubprocess(...args);
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
        tokenId,
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
   * @param {string} [tokenId]
   */
  stopSubprocess(processId, processInstanceId, tokenId) {
    /** @type {Iterable<ChildProcessEntry>} */
    let toStop;

    if (processId === '*' && processInstanceId === '*') toStop = this.getAllProcesses();
    // @ts-ignore
    else toStop = this.getProcess(processId, processInstanceId, undefined, tokenId);

    // NOTE: maybe give a warning?
    if (!toStop) return;

    for (const scriptTask of toStop) {
      // No further actions should be necessary, because the processes will end and the on 'close'
      // event listener will do the cleanup
      if (!scriptTask.process.kill()) {
        throw new Error(`Failed to kill subprocess ${scriptTask.process.pid}`);
      }
    }
  }

  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} [tokenId]
   */
  pauseSubprocess(processId, processInstanceId, tokenId) {
    const toPause = this.getProcess(processId, processInstanceId, undefined, tokenId);

    // NOTE: maybe give a warning?
    if (!toPause) return;

    for (const process of toPause) {
      process.process.send({ type: 'pause-execution' });
    }
  }
  /**
   * @param {string} processId
   * @param {string} processInstanceId
   * @param {string} [tokenId]
   */
  resumeSubprocess(processId, processInstanceId, tokenId) {
    const toResume = this.getProcess(processId, processInstanceId, undefined, tokenId);

    // NOTE: maybe give a warning?
    if (!toResume) return;

    for (const process of toResume) {
      process.process.send({ type: 'resume-execution' });
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
      return sendReply(undefined, {
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
   * @param {string} [tokenId]
   */
  deleteProcess(processId, processInstanceId, scriptIdentifier, tokenId) {
    this.childProcesses = this.childProcesses.filter((childProcess) => {
      if (processId && childProcess.processId !== processId) return true;
      if (processInstanceId && childProcess.processInstanceId !== processInstanceId) return true;
      if (scriptIdentifier && childProcess.scriptIdentifier !== scriptIdentifier) return true;
      if (tokenId && childProcess.tokenId !== tokenId) return true;
      return false;
    });
  }

  deleteAllProcess() {
    this.childProcesses = [];
  }
}

module.exports = SubprocesScriptExecution;
