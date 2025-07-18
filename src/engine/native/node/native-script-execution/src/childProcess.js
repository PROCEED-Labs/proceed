const ivm = require('isolated-vm');

const [
  processId,
  processInstanceId,
  scriptIdentifier,
  tokenId,
  scriptString,
  token,
  processCommunicationAdress,
] = process.argv.slice(2);

if (
  !processId ||
  !processInstanceId ||
  !scriptIdentifier ||
  !tokenId ||
  !scriptString ||
  !token ||
  !processCommunicationAdress
)
  throw new Error(
    'Expected the following args processId, processInstanceId, tokenId, scriptString, token',
  );

async function callToExecutor(endpoint, body) {
  try {
    const response = await fetch(
      `${processCommunicationAdress}/${processId}/${processInstanceId}/${scriptIdentifier}/${endpoint}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          ['content-type']: 'application/json',
          authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok)
      return {
        error: `Failed to contact engine universal part: ${response.status} ${response.statusText}`,
      };

    const contentType = response.headers.get('content-type');

    if (!contentType) {
      return;
    } else if (contentType.includes('application/json')) {
      const result = await response.json();
      if (!('result' in result) && !('error' in result)) {
        return { result: undefined };
      }
      return result;
    } else {
      return await response.text();
    }
  } catch (e) {
    console.error(e);

    if (endpoint === 'result') process.exit(1);

    return {
      error: 'Unknown error',
    };
  }
}

const isolate = new ivm.Isolate({ memoryLimit: 128 });
const context = isolate.createContextSync();

context.global.setSync('global', context.global.derefInto());

context.global.setSync('_stdout_log', function (...args) {
  console.log(...args);
});

// NOTE: Extern capabilities (provided by neo-engine)
// log, console, variable, getService, BpmnEscalation, BpmnError
// TODO: pass these in as a process argument

// TODO: setProgress(<number between 0 - 100>)

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

async function _callToService(serviceName, method, args) {
  /**@type {import('isolated-vm').Reference} */
  const call = $0;
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
    new ivm.Reference(function (serviceName, method, args) {
      return callToExecutor('call', {
        functionName: `getService.${serviceName}.${method}`,
        args: [processId, processInstanceId, tokenId, ...JSON.parse(args)],
      });
    }),
  ],
);

const errorClasses = ['BpmnError', 'BpmnEscalation'];

for (const errorName of errorClasses)
  context.evalClosureSync(
    `class ${errorName} {
      constructor(...args) {
        this.errorArgs = args;
        this.errorClass = '${errorName}';
      }
  }
  globalThis["${errorName}"] = ${errorName};
  `,
  );

function wrapScriptWithErrorHandling(script) {
  return `try {
    ${script}
  } catch(e){
    if(${errorClasses.map((error) => 'e instanceof ' + error).join(' || ')})
      throw JSON.stringify(e);
    else throw e;
  }
  `;
}

const sleep = new ivm.Reference((ms) => new Promise((res) => setTimeout(res, ms)));

context.evalClosureSync(
  async function setTimeoutAsync(cb, ms) {
    await $0.apply(null, [ms], { result: { promise: true } });
    cb();
  }.toString() + `globalThis["setTimeoutAsync"] = setTimeoutAsync;`,
  [sleep],
);

context.evalClosureSync(
  async function setIntervalAsync(cb, ms) {
    do {
      await $0.apply(null, [ms], { result: { promise: true } });
    } while (!(await cb()));
  }.toString() + 'globalThis["setIntervalAsync"]=setIntervalAsync;',
  [sleep],
);

function wrapScriptInAsyncFunction(script) {
  return `async function main() { ${script} }; main();`;
}

context
  .eval(wrapScriptInAsyncFunction(wrapScriptWithErrorHandling(scriptString)), {
    promise: true,
    externalCopy: true,
  })
  .then((result) => {
    callToExecutor('result', { result: result.copy() });
  })
  .catch((err) => {
    let result = err;
    if (typeof err === 'string') {
      try {
        result = JSON.parse(err);
      } catch (_) {}
    } else if (err instanceof Error) {
      result = {
        errorClass: '_javascript_error',
        name: err.name,
        message: err.message,
      };
    }

    console.error(result);

    callToExecutor('result', { result }).finally(() => process.exit(1));
  });
