// Detect all injected modules
let dependencies: any[] = [];
module.exports = class GenericModule {
  static registerModule(mod: any) {
    if (mod.id && mod.onAfterEngineLoaded) {
      dependencies.push(mod.id);
    }
  }
  static startEngine() {}
};
// We overwrite the @proceed/native module, to detect all registered modules and
// filter the ones which should be injected. This has to be of type Module, so
// we just pass the module object of this file.
require.cache[require.resolve('@proceed/native')] = module;

// native-mdns keeps this process alive once it was required which means webpack
// never shut downs. Therefore we also mock it here.
require.cache[require.resolve('@proceed/native-mdns')] = module;
require('./index.ts');

const path = require('path');

module.exports = {
  target: 'node',
  entry: dependencies.concat(['./native/src/injector.js']), // last in list is exported
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, '../../../../build/engine'),
    filename: 'injector.js',
    libraryTarget: 'commonjs',
  },
  externals: {
    '@proceed/core': 'Function',
  },
  node: {
    __dirname: false,
  },
};

console.log(module.exports);
