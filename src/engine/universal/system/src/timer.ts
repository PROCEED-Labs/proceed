import { System } from './system';
import Console from './console';

class Timer extends System {
  // TODO: change when Console is ESM module
  private logger: ReturnType<typeof Console._getLoggingModule>;

  private getLogger() {
    if (!this.logger) {
      this.logger = Console._getLoggingModule().getLogger({ module: 'SYSTEM' });
    }
    return this.logger;
  }

  setTimeout(handler: TimerHandler, timeout?: number, ...args: any[]) {
    if (typeof setTimeout !== 'undefined') {
      return setTimeout(handler, timeout, ...args);
    }
    this.getLogger().error('No `setTimeout()` method available.');
    return null;
  }

  setInterval(handler: TimerHandler, timeout?: number, ...args: any[]) {
    if (typeof setInterval !== 'undefined') {
      return setInterval(handler, timeout, ...args);
    }
    this.getLogger().error('No `setInterval()` method available.');
    return null;
  }

  clearTimeout(id: number) {
    if (typeof clearTimeout !== 'undefined') {
      return clearTimeout(id);
    }
    this.getLogger().error('No `clearTimeout()` method available.');
    return null;
  }

  clearInterval(id: number) {
    if (typeof clearInterval !== 'undefined') {
      return clearInterval(id);
    }
    this.getLogger().error('No `clearInterval()` method available.');
    return null;
  }
}

export default Timer;
