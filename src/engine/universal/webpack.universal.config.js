const path = require('path');

module.exports = {
  entry: './core/src/module.js',
  mode: 'production',
  output: {
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, '../../../build/engine'),
    filename: 'universal.js',
    libraryTarget: 'umd',
    library: 'PROCEED',
    globalObject: 'this',
  },
  node: {
    process: false,
  },
  resolve: {
    alias: {
      './separator.js$': './separator.webpack.js',
    },
  },
};
