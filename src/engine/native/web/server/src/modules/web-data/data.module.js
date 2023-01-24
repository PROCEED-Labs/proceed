/* eslint-disable import/prefer-default-export */
/* eslint-disable no-undef */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */

export class Data {
  constructor() {
    this.commands = ['read', 'write'];
    this._mutex = new Set();
    this._lastInQueue = new Map();
    /**
     * Stop the whole process (cleanup).
     */
    this._stop = false;
  }

  executeCommand(command, args) {
    if (command === 'read') {
      return this.read(args);
    }
    if (command === 'write') {
      return this.write(args);
    }
    return undefined;
  }

  async read(args) {
    let succeed;
    let fail;
    const promisedResponse = new Promise((resolve, reject) => {
      succeed = resolve;
      fail = reject;
    });

    const [key] = args;

    let table = key;
    if (key.indexOf('/') !== -1) {
      table = key.substr(0, key.indexOf('/'));
    }

    // Check mutex
    if (this._mutex.has(table)) {
      // Wait till previous operations on this key finished.
      await this._freeQueue(promisedResponse, table);
    }

    if (key.indexOf('/') === -1) {
      // Whole file
      if (!localStorage.getItem(key)) {
        fail();
      }
      const file = JSON.parse(localStorage.getItem(key));
      succeed([file]);
    } else {
      const filename = key.substr(0, key.indexOf('/'));
      const id = key.substr(key.indexOf('/') + 1);

      if (!localStorage.getItem(filename)) {
        fail();
      }

      const file = JSON.parse(localStorage.getItem(filename));
      const value = file[id];
      succeed([value]);
    }

    return promisedResponse;
  }

  async write(args) {
    const [key, value] = args;

    let table = key;
    if (key.indexOf('/') !== -1) {
      table = key.substr(0, key.indexOf('/'));
    }

    let succeed;
    let fail;
    const promisedResponse = new Promise((resolve, reject) => {
      succeed = resolve;
      fail = reject;
    }).finally(() => {
      this._mutex.delete(table);
      if (this._lastInQueue.get(table) === promisedResponse) {
        this._lastInQueue.delete(table);
      }
    });

    // Check mutex
    if (this._mutex.has(table)) {
      // Wait till previous operations on this key finished.
      await this._freeQueue(promisedResponse, table);
    }

    // Block resource
    if (!this._lastInQueue.has(table)) {
      this._lastInQueue.set(table, promisedResponse);
    }
    this._mutex.add(table);

    // Delete
    if (value === null) {
      if (key.indexOf('/') === -1) {
        // delete file
        if (!localStorage.getItem(key)) {
          fail();
        }
        localStorage.removeItem(key);
        succeed();
      } else {
        // delete single val
        const filename = key.substr(0, key.indexOf('/'));
        const id = key.substr(key.indexOf('/') + 1);

        if (!localStorage.getItem(filename)) {
          fail();
        }

        const file = JSON.parse(localStorage.getItem(filename));
        file[id] = '';
        localStorage.setItem(filename, JSON.stringify(file));
        succeed();
      }
      // New val
    } else {
      const filename = key.substr(0, key.indexOf('/'));
      const id = key.substr(key.indexOf('/') + 1);

      const file = localStorage.getItem(filename) ? JSON.parse(localStorage.getItem(filename)) : {};
      file[id] = value;
      localStorage.setItem(filename, JSON.stringify(file));
      succeed();
    }

    return promisedResponse;
  }

  async _freeQueue(operation, table) {
    const last = this._lastInQueue.get(table);
    this._lastInQueue.set(table, operation);

    const wait = new Promise((resolve) => {
      last.then(() => {
        if (!this._stop) {
          resolve();
        }
      });
    });
    return wait;
  }
}
