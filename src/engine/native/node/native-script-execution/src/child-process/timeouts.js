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
module.exports = function setupTimeouts({ context }) {
  const sleep = new ivm.Reference((ms) => new Promise((res) => setTimeout(res, ms)));

  context.evalClosureSync(
    async function setTimeoutAsync(cb, ms) {
      // @ts-expect-error $0 will be defined when running in the isolate
      await $0.apply(null, [ms], { result: { promise: true } });
      cb();
    }.toString() + `globalThis["setTimeoutAsync"] = setTimeoutAsync;`,
    [sleep],
  );

  context.evalClosureSync(
    async function setIntervalAsync(cb, ms) {
      do {
        // @ts-expect-error $0 will be defined when running in the isolate
        await $0.apply(null, [ms], { result: { promise: true } });
      } while (!(await cb()));
    }.toString() + 'globalThis["setIntervalAsync"]=setIntervalAsync;',
    [sleep],
  );
};
