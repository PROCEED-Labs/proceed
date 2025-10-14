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

          return (...args) => callToService(serviceName, method, args);
        },
      },
    );
  }

  /**
   * @param {string} serviceName
   * @param {string} method
   * @param {any[]} args
   */
  async function _callToService(serviceName, method, args) {
    /**@type {import('isolated-vm').Reference} */
    const call = $0;

    /** @type {any} */
    const result = await call.apply(null, [serviceName, method, JSON.stringify(args)], {
      result: { promise: true, copy: true },
    });

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

  context.evalClosureSync(
    `
  ${_callToService.toString()}; globalThis["callToService"] = _callToService;
  ${_getService.toString()}; globalThis["getService"] = _getService;
  `,
    [
      new ivm.Reference(
        /**
         * @param {string} serviceName
         * @param {string} method
         * @param {string} args stringified array of args
         */
        function (serviceName, method, args) {
          return callToExecutor('call', {
            functionName: `getService.${serviceName}.${method}`,
            args: [processId, processInstanceId, tokenId, ...JSON.parse(args)],
          });
        },
      ),
    ],
  );
};
