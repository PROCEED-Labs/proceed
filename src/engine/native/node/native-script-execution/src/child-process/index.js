// @ts-check

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

/* -------------------------------------------------------------------------------------------------
 * Basic isolated vm setup
 * -----------------------------------------------------------------------------------------------*/

const isolate = new ivm.Isolate({ memoryLimit: 128 });
const context = isolate.createContextSync();

context.global.setSync('global', context.global.derefInto());

context.global.setSync('_stdout_log', function (...args) {
  console.log(...args);
});

const wait = new ivm.Reference((ms) => new Promise((res) => setTimeout(res, ms)));

context.evalClosureSync(
  function wait(ms) {
    $0.applySyncPromise(null, [ms], {});
  }.toString() + `globalThis["wait"] = wait;`,
  [wait],
);

context.evalClosureSync(
  async function waitAsync(ms) {
    await $0.apply(null, [ms], {
      result: { promise: true },
    });
  }.toString() + `globalThis["waitAsync"] = waitAsync;`,
  [wait],
);

/* -------------------------------------------------------------------------------------------------
 * Function for communication with universal part
 * -----------------------------------------------------------------------------------------------*/

/**
 * @param {string} endpoint
 * @param {any} body
 */
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

/* -------------------------------------------------------------------------------------------------
 * Setup PROCEED's api for script task
 *
 * All the functions that aren't defined in V8's isolates and that we have to provide.
 * -----------------------------------------------------------------------------------------------*/

// NOTE: Extern capabilities (provided by neo-engine)
// log, console, variable, getService, BpmnEscalation, BpmnError
// TODO: pass these in as a process argument
// TODO: setProgress(<number between 0 - 100>)

const setupData = {
  context,
  callToExecutor,
  processId,
  processInstanceId,
  tokenId,
};

const setupSimpleFunctionCalls = require('./simple-function-calls');
setupSimpleFunctionCalls(setupData);

const setupServiceCalls = require('./service-calls');
setupServiceCalls(setupData);

const { setupBpmnErrors, wrapScriptWithErrorHandling } = require('./bpmn-errors');
setupBpmnErrors(setupData);

const setupTimeouts = require('./timeouts');
setupTimeouts(setupData);

/* -------------------------------------------------------------------------------------------------
 * Execute script
 * -----------------------------------------------------------------------------------------------*/

function wrapScriptInAsyncFunction(script) {
  return `async function main() { ${script} }; main();`;
}

const isolateCode = wrapScriptInAsyncFunction(wrapScriptWithErrorHandling(scriptString));

// After .eval is done, there may still be code running inside the isolate, that the .eval returns
// means just that the code the user wrote returned a value, the process will remain open until the
// code finishes, once it does, the script execution module will catch the event that the process
// ended and pass the value from the eval to the universal part of the engine.
// If we wanted to kill everything once the evaluation is done we would need to dispose of the
// isolate.
// I haven't figured out a better way to do this yet

context
  .eval(isolateCode, {
    promise: true,
    externalCopy: true,
  })
  .then((result) => result)
  .then((result) => {
    callToExecutor('result', { result: result.copy() });
  })
  .catch((err) => {
    let result = err;
    if (typeof err === 'string') {
      try {
        result = JSON.parse(err);
      } catch (_) { }
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
