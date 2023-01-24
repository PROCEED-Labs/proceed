const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = () => {
  return new Promise((resolve) => {
    // ensure that the initial config value is as expected on test start
    fs.writeFileSync(
      path.resolve(__dirname, '.', 'testEngine', 'config.json'),
      JSON.stringify({
        name: 'TestEngine',
        description: 'This engine is used for the proceed engine e2e tests',
        machine: {
          port: 33019,
          classes: [],
          domains: [],
          inputs: [],
          outputs: [],
          onlineCheckingAddresses: [],
          currentlyConnectedEnvironments: [],
        },
        engine: {
          networkRequestTimeout: 10,
        },
      })
    );

    let out = '';
    let ready = false;
    const engineProcess = spawn('node', [path.resolve(__dirname, 'testEngine', 'startEngine.js')], {
      cwd: __dirname,
      detached: false,
    });
    engineProcess.stdout.on('data', (data) => {
      // eslint-disable-next-line no-console
      console.log(data.toString());
      out += data;
      if (out.includes('Published bonjour service:') && !ready) {
        // wait for the engine to start and for the load times to be calculated
        setTimeout(
          () => {
            global.__engineProcess__ = engineProcess;
            resolve();
          },
          // this 10s timeout value is set in the configuration and can even be higher! adapt it to the default!
          10000
        );
        ready = true; // avoid setting multiple timeouts
      }
    });
  });
};
