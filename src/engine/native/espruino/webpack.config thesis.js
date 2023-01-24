const path = require('path');

module.exports = {
  entry: ['babel-polyfill', '../../modules/core/src/module.js'],
  mode: 'production',
  target: 'web',
  output: {
    filename: 'engine.js',
    path: path.resolve(__dirname, 'engine.js'),
    libraryTarget: 'commonjs2',
    library: 'engine',
  },
  node: {
    fs: 'empty',
    module: 'empty',
    util: 'empty',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
