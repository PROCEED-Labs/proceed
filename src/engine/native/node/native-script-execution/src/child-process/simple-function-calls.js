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
module.exports = function setupSimpleFunctionCalls({ context, callToExecutor }) {
  const structure = {
    log: ['trace', 'debug', 'info', 'warn', 'error'],
    console: ['trace', 'debug', 'info', 'warn', 'error', 'log', 'time', 'timeEnd'],
    variable: ['get', 'set', 'getAll'],
  };

  for (const objName of Object.keys(structure)) {
    const functionNames = structure[objName];

    context.evalSync(`globalThis["${objName}"] = {}`);

    // NOTE: maybe replace JSON for isolated-vm solution
    for (const functionName of functionNames) {
      context.evalClosureSync(
        `globalThis["${objName}"]["${functionName}"] = function (...args) {
        const result = $0.applySyncPromise(null, [JSON.stringify(args)], {});

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
      }`,
        [
          new ivm.Reference(async function (args) {
            const result = await callToExecutor('call', {
              functionName: `${objName}.${functionName}`,
              args: JSON.parse(args),
            });

            return new ivm.ExternalCopy(result).copyInto({ release: true, transferIn: true });
          }),
        ],
      );
    }
  }
};
