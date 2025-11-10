// @ts-check

const ivm = require('isolated-vm');

const pauseMessageType = 'pause-execution';
const resumeMessageType = 'resume-execution';

/** @param {Omit<import('.').ScriptTaskSetupData, "waitUntilResumed">} setupData */
module.exports = function setupPauseAndResumeLayer({ context }) {
  /** @typedef {{
   *    promise: Promise<void>;
   *    resolve: () => void;
   *    reject: () => void;
   * }} PausePromise */

  /** @type { PausePromise | undefined } */
  let executionPausedPromise = undefined;

  /** @param {any} message */
  function ipcMessageHandler(message) {
    try {
      // TODO: check structure of message

      if (message.type === pauseMessageType) {
        /** @type { PausePromise } */
        const pausePromise = {};
        pausePromise.promise = new Promise((res, rej) => {
          pausePromise.resolve = res;
          pausePromise.reject = rej;
        });

        executionPausedPromise = pausePromise;
      } else if (message.type === resumeMessageType && executionPausedPromise) {
        executionPausedPromise.resolve();
        executionPausedPromise = undefined;
      }
    } catch (e) {
      console.error('Error pausing/resuming execution', e);
    }
  }
  process.on('message', ipcMessageHandler);

  context.evalClosure("globalThis['_unmountPauseListener'] = function() { $0.apply(null, []) }", [
    new ivm.Reference(() => {
      // If this listener isn't removed, the childProcess will not end after the evaluation of
      // the script task is done

      process.removeListener('message', ipcMessageHandler);
    }),
  ]);

  return {
    async waitUntilResumed() {
      if (executionPausedPromise) {
        await executionPausedPromise.promise;
      }
    },
    /** @param {string} script */
    addClosePauseListenerString(script) {
      return script + '\n_unmountPauseListener();';
    },
  };
};
