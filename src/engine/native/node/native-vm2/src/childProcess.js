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
      `${processCommunicationAdress}/${processId}/${processInstanceId}/${endpoint}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          ['content-type']: 'application/json',
          authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) throw new Error('Response not ok');

    const contentType = response.headers.get('content-type');
    if (!contentType) return;
    else if (contentType.includes('application/json')) return await response.json();
    else return await response.text();
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

// TODO: setProgress(<number between 0 - 100>)
// TODO: await setIntervalAsync( <clb>, <number in milliseconds> )
// TODO: await setTimeoutAsync( <clb>, <number in milliseconds> )
// TODO: getService('capabilities')
// TODO: getService('network')
// TODO: throw new BpmnError( ["<reference>",] "explanation" )
// TODO: throw new BpmnEscalation( ["<reference>",] "explanation" );

// NOTE: Extern capabilities (provided by neo-engine)
// log, console, variable, getService, BpmnEscalation, BpmnError
// TODO: pass these in as a process argument
for (const functionName of ['log', 'console', 'variable', 'getService', 'yuhu']) {
  context.global.setSync(
    `_${functionName}`,
    new ivm.Reference(async function (...args) {
      return callToExecutor('call', { functionName: functionName, args });
    }),
  );

  context.evalSync(
    `function ${functionName}(...args) {
      return _${functionName}.apply(null, args, { result: { promise: true, copy: true } });
    }`,
  );
}

const hostile = isolate.compileScriptSync(`function main(){ ${scriptString} }; main();`);

hostile
  .run(context)
  .then((result) => {
    callToExecutor('result', { result });
  })
  .catch((err) => console.error(err));
