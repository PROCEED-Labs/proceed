/* eslint-disable class-methods-use-this */
const NativeModule = require('@proceed/native-module');
const scriptExecutor = require('./scriptExecutor');

/**
 * @class
 */
class VM2 extends NativeModule {
  constructor() {
    super();
    this.id = require.resolve('@proceed/native-vm2');
  }

  onAfterEngineLoaded(engine) {
    engine.provideScriptExecutor(scriptExecutor({}));
  }
}

module.exports = VM2;
