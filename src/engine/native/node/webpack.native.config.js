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
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                emitDeclarationOnly: false,
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.node$/,
        loader: 'node-loader',
        options: {},
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
    'node:child_process': 'commonjs2 child_process',
  },
  node: {
    __dirname: false,
  },
  resolve: {
    extensions: ['.js', '.ts', '.json', '.wasm', '.mjs', '.node'],
  },
};
