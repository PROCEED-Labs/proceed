// @ts-check

const ivm = require('isolated-vm');

/**
 * @param {{
 *  context: import('isolated-vm').Context
 *  callToExecutor: (endpoint: string, body: any) => Promise<any>
 *  processId: string,
 *  processInstanceId: string,
 *  tokenId: string
 * }} data
 * */
module.exports = function setupServiceCalls({
  context,
  callToExecutor,
  processId,
  processInstanceId,
  tokenId,
}) {
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

  /** @param {string} serviceName */
  function _getService(serviceName) {
    return new Proxy(
      {},
      {
        get: function (_, method) {
          return (...args) => callToService(serviceName, method, args);
        },
      },
    );
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
