/* eslint-disable class-methods-use-this */
const NativeModule = require('@proceed/native-module');

module.exports = class Console extends NativeModule {
  constructor() {
    super();
    this.commands = ['console_log'];
  }

  executeCommand(command, args) {
    if (command === 'console_log') {
      return this.consoleLog(args);
    }
    return undefined;
  }

  async consoleLog(args) {
    const [message] = args;

    // eslint-disable-next-line no-console
    console.log(message);
  }
};
