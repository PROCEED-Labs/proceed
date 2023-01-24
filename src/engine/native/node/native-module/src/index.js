/* eslint-disable class-methods-use-this */
class NativeModule {
  constructor() {
    this.commands = [];
  }

  // eslint-disable-next-line no-unused-vars
  executeCommand(command, args, send) {
    throw new Error(
      `The NativeModule subclass ${this.constructor.name} doesn't overwrite the required \`executeCommand()\` method!`
    );
  }
}

module.exports = NativeModule;
