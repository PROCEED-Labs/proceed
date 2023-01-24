const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

/**
 * Starts an engine that uses the info at the given path to expose manipulated information
 *
 * @param {string} mockFilesPath the path to the mock machine info and config
 * @returns {Promise} - resolves to an information object about the process the engine runs in
 */
function startMockEngineProcess(mockFilesPath) {
  return new Promise((resolve) => {
    let ready = false;

    // remove data_files directory to prevet errors due to faulty json files
    const dataFilesPath = path.join(mockFilesPath, 'data_files');
    if (fs.existsSync(dataFilesPath) && fs.lstatSync(dataFilesPath).isDirectory()) {
      fs.removeSync(dataFilesPath);
    }

    let outputHandlers = [];

    const engineProcess = spawn('node', ['mockEngine.js', mockFilesPath], {
      cwd: __dirname,
      detached: false,
    });

    const { name, machine } = JSON.parse(
      fs.readFileSync(path.resolve(mockFilesPath, 'config.json'), 'utf8')
    );
    const { port } = machine;
    const { id } = JSON.parse(fs.readFileSync(path.resolve(mockFilesPath, 'machine.json'), 'utf8'));

    // returns promises for each given regEx that resolves when the regEx matches an output from the process
    const setOutputCheckers = (regexArray) => {
      const checkPromises = [];
      outputHandlers = [];

      regexArray.forEach((regex) => {
        let externalResolve;
        checkPromises.push(
          new Promise((checkResolve) => {
            externalResolve = checkResolve;
          })
        );

        outputHandlers.push({ regex, resolver: externalResolve });
      });

      return checkPromises;
    };

    function resetTestOutputStream() {
      this.testOut = '';
    }

    function getTestOutputStream() {
      return this.testOut;
    }

    const processInfoObject = {
      id,
      name,
      port,
      process: engineProcess,
      out: '',
      testOut: '',
      setOutputCheckers,
      resetTestOutputStream,
      getTestOutputStream,
      mockFilesPath,
    };

    engineProcess.stdout.on('data', (data) => {
      const dataString = data.toString();

      // check output with all regExs and resolve associated promises if they match
      outputHandlers.forEach((handler) => {
        if (handler.regex.test(dataString)) {
          handler.resolver(dataString);
        }
      });

      // eslint-disable-next-line no-console
      console.log(`${name}: `, dataString);
      processInfoObject.out += data;
      processInfoObject.testOut += data;

      if (processInfoObject.out.includes('Published bonjour service:') && !ready) {
        setTimeout(() => {
          resolve(processInfoObject);
        }, 5000);
        ready = true; // avoid setting multiple timeouts
      }
    });
    engineProcess.stderr.on('data', (data) => {
      console.log(`${name}: `, data.toString());
    });
  });
}

/**
 * Tries to start a given number of engines in separate processes
 *
 * @param {number} numProcesses the number of engines we want to start
 * @throws throws if the given number is bigger than the amount of mockEngines that were defined
 * @returns {array} - array containing information objects for each subprocess
 */
async function startMockEngineProcesses(numProcesses) {
  const mockEnginePaths = [];

  for (let i = 1; i <= numProcesses; i += 1) {
    const newPath = path.join(__dirname, '.', '..', 'data', 'mockMachines', `machine${i}`);
    if (!(fs.existsSync(newPath) && fs.lstatSync(newPath).isDirectory())) {
      throw new Error('There are not enough mock Engines defined to start given amount of engines');
    }
    mockEnginePaths.push(newPath);
  }

  const engineProcesses = await Promise.all(mockEnginePaths.map(startMockEngineProcess));

  return engineProcesses;
}

// see if command line args contain a number and use it as number of requested processes
const processCount = parseInt(
  process.argv.find((arg) => parseInt(arg, 10)),
  10
);
if (processCount) {
  startMockEngineProcesses(processCount).catch((err) => console.log(err));
} else {
  console.log('Please enter the number of engines you want');
}

module.exports = {
  startMockEngineProcesses,
};
