const path = require('path');

module.exports = {
  entry: './core/src/module.js',
  mode: 'production',
  target: 'node',
  output: {
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, '../../../build/engine'),
    filename: 'universal.js',
    libraryTarget: 'umd',
    library: 'PROCEED',
    globalObject: 'this',
  },
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
    ],
  },
  node: {
    process: false,
  },
  resolve: {
    extensions: ['.js', '.ts', '.json', '.wasm', '.mjs'],
    alias: {
      './separator.js$': './separator.webpack.js',
    },
  },
};
