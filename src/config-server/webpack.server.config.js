const path = require('path');

module.exports = {
  target: 'node',
  entry: './configServer.js',
  mode: 'production',
  output: {
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, '../../build/config-server'),
    filename: 'server.js',
  },
};
