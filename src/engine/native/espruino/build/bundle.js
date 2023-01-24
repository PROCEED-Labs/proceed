const DPE = require('engine.js'),
  mockIpc = { emit: () => Terminal.println('emit'), listen: () => Terminal.println('listen') };
