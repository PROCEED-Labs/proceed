/* eslint-disable class-methods-use-this */
/* eslint-disable import/prefer-default-export */

export class Console {
  constructor() {
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
    console.log(message);
  }
}
