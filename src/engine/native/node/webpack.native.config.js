const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  target: 'node',
  entry: './index.ts',
  mode: 'development',
  output: {
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, '../../../../build/engine'),
    filename: 'proceed-engine.js',
  },
  // https://v4.webpack.js.org/plugins/copy-webpack-plugin/
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: path.join(__dirname, 'Dockerfile'),
        to: 'Dockerfile',
        toType: 'file',
      },
      {
        from: path.join(__dirname, 'proceed-engine.service'),
        to: 'proceed-engine.service',
      },
    ]),
  ],
  externals: {
    './injector.js': 'Function',
  },
  node: {
    __dirname: false,
  },
  resolve: {
    extensions: ['.js', '.ts', '.json', '.wasm', '.mjs'],
  },
};
