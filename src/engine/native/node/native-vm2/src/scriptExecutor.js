const { BpmnEscalation, BpmnError } = require('neo-bpmn-engine');
const { logging } = require('@proceed/machine');
// We detect if this is the built version of the PROCEED engine, meaning
// that the native part and the universal are separately bundled and are
// available as `proceed-engine.js` and `universal.js`.
const isElectronOrServer =
  (typeof navigator !== 'undefined' &&
    navigator.userAgent &&
    navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) ||
  process.env.SERVER;

// If webpack is used (bundled engine or MS electron and server versions), then we have the
// universal part separately bundled.
const bundledExternalUniversal = typeof __webpack_require__ === 'function' && !isElectronOrServer;

// non_webpack_require is translated to 'require()' by webpack for requiring at runtime, but not included into the bundle: https://stackoverflow.com/questions/46185302/non-webpack-require-is-not-defined
// non_webpack_require is used for the webpack versions (Builded Engine, MS versions)
// require(vm2) is only used for the Engine dev version
const { NodeVM } = bundledExternalUniversal ? __non_webpack_require__('vm2') : require('vm2');

module.exports = function createScriptExecutor(options = {}) {
  return {
    execute: async (processId, processInstanceId, tokenId, scriptString, dependencies) => {
      const getService =
        // if the dependencies contain 'getService', then return function that attaches processId and processInstanceId to every function call
        dependencies['getService'] &&
        ((serviceName) => {
          const service = dependencies.getService(serviceName);
          if (service) {
            return new Proxy(service, {
              get: function (target, name) {
                if (name in target && typeof target[name] === 'function') {
                  return (...args) => target[name](processId, processInstanceId, tokenId, ...args);
                }

                return target[name];
              },
            });
          }

          return service;
        });

      const setIntervalAsync = (functionToBeCalled, miliseconds) => {
        return new Promise((resolve, reject) => {
          const statePolling = setInterval(async () => {
            try {
              const endIntervall = await functionToBeCalled();
              if (endIntervall) {
                clearInterval(statePolling);
                resolve();
              }
            } catch (e) {
              clearInterval(statePolling);
              reject(e);
            }
          }, miliseconds);
        });
      };

      const setTimeoutAsync = (functionToBeCalled, miliseconds) => {
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const result = await functionToBeCalled();
              resolve(result);
            } catch (e) {
              reject(e);
            }
          }, miliseconds);
        });
      };

      // available variables in vm2 enviroment
      const deps = {
        ...options.sandbox,
        ...dependencies,
        setTimeoutAsync,
        setTimeout: undefined,
        setIntervalAsync,
        setInterval: undefined,
        getService,
        processId,
        processInstanceId,
        tokenId,
        process: null,
      };

      // wrapper='none' to retrieve value returned by the script.
      const vm = new NodeVM({ ...options, sandbox: deps, wrapper: 'none' });
      const asyncFn = vm.run(`return async function() { ${scriptString} };`, './');

      const log = logging.getLogger({
        processID: processId,
      });

      return new Promise((resolve, reject) => {
        asyncFn()
          .then((result) => resolve(result))
          .catch((err) => {
            if (!(err instanceof BpmnError) && !(err instanceof BpmnEscalation)) {
              log.error({
                msg: `Technical Error in ScriptTask on Token ${tokenId} at Instance ${processInstanceId}: ${err}`,
                instanceId: processInstanceId,
              });
            }
            reject(err);
          });
      });
    },

    stop: (processId, processInstanceId) => {
      // Not implemented
    },
  };
};
