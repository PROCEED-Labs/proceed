// @ts-check

const ivm = require('isolated-vm');

/** @param {import('.').ScriptTaskSetupData} setupData */
module.exports = function setupServiceCalls({
  context,
  callToExecutor,
  processId,
  processInstanceId,
  tokenId,
}) {
  /** @param {string} serviceName */
  function _getService(serviceName) {
    return new Proxy(
      {},
      {
        get: function (_, method) {
          // network-server is a bit more complex so it requires it's own implementation
          // _networkServerCall is defined in ./http-server.js
          if (serviceName === 'network-server') {
            return (...args) => _networkServerCall(method, args);
          }

          return (...args) => _callToService(serviceName, method, args);
        },
      },
    );
  }

  function _parseResult(_result) {
    const result = _result.copy();

    if (result && 'result' in result) {
      return result.result;
    } else {
      if (!result) {
        throw new Error('Unknown error');
      } else if (typeof result.error === 'string') {
        throw new Error(result.error);
      } else {
        throw result.error;
      }
    }
  }

  /**
   * @param {string} serviceName
   * @param {string} method
   * @param {any[]} args
   */
  function _callToService(serviceName, method, args) {
    /**@type {import('isolated-vm').Reference} */
    const call = $0;

    if (method.substring(method.length - 5) === 'Async') {
      const methodName = method.substring(0, method.length - 5);
      /** @type {any} */
      const promise = call.apply(null, [serviceName, methodName, JSON.stringify(args)], {
        result: { promise: true, copy: true },
      });
      return promise.then(_parseResult);
    } else {
      /** @type {any} */
      const result = call.applySyncPromise(null, [serviceName, method, JSON.stringify(args)]);
      return _parseResult(result);
    }
  }

  context.evalClosureSync(
    `
  ${_parseResult.toString()};
  ${_callToService.toString()};
  ${_getService.toString()}; globalThis["getService"] = _getService;
  `,
    [
      new ivm.Reference(
        /**
         * @param {string} serviceName
         * @param {string} method
         * @param {string} args stringified array of args
         */
        async function (serviceName, method, args) {
          const result = await callToExecutor('call', {
            functionName: `getService.${serviceName}.${method}`,
            args: [processId, processInstanceId, tokenId, ...JSON.parse(args)],
          });
          return new ivm.ExternalCopy(result);
        },
      ),
    ],
  );
};
