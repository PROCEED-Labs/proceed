const ivm = require('isolated-vm');

const [processId, processInstanceId, tokenId, scriptString, token, processCommunicationAdress] =
  process.argv.slice(2);

if (
  !processId ||
  !processInstanceId ||
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
    // TODO: don't hardcode address and port
    const response = await fetch(
      `${processCommunicationAdress}/scriptexecution/${processId}/${processInstanceId}/${endpoint}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          ['content-type']: 'application/json',
          authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) throw new Error(`${endpoint}: Response not ok`);

    const contentType = response.headers.get('content-type');

    if (!contentType) {
      return;
    } else if (contentType.includes('application/json')) {
      const json = await response.json();
      return 'result' in json ? json.result : json;
    } else {
      return await response.text();
    }
  } catch (e) {
    // TODO: log error
    console.error(e);

    if (endpoint === 'result') process.exit(1);
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
// TODO: getService('capabilities')
// TODO: getService('network')

const structure = {
  log: ['get'],
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
        return $0.applySyncPromise(null, [JSON.stringify(args)], {}).copyInto();
      }`,
      [
        new ivm.Reference(async function (args) {
          const result = await callToExecutor('call', {
            functionName: `${objName}.${functionName}`,
            args: JSON.parse(args),
          });

          return new ivm.ExternalCopy(result);
        }),
      ],
    );
  }
}

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

// NOTE: I thought this was going to eventually reach the maximum stack call size
// but when testing it, it never happened
context.evalClosureSync(
  function setIntervalAsync(cb, ms) {
    async function recursiveCall(res, rej) {
      try {
        await $0.apply(null, [ms], { result: { promise: true } });
        const stop = await cb();

        if (stop) res();
        else recursiveCall(res, rej);
      } catch (_) {
        rej;
      }
    }

    return new Promise((res, rej) => recursiveCall(res, rej));
  }.toString() + 'globalThis["setIntervalAsync"]=setIntervalAsync;',
  [sleep],
);

context
  .eval(wrapScriptWithErrorHandling(scriptString), { promise: true })
  .then((result) => {
    callToExecutor('result', { result });
  })
  .catch((err) => {
    let result = err;
    try {
      result = JSON.parse(err);
    } catch (_) {}

    console.error(result);

    callToExecutor('result', { result }).finally(() => process.exit(1));
  });
