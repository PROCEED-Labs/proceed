const NativeModule = require('@proceed/native-module');
const fs = require('fs');
const { default: exitHook } = require('@darkobits/adeiu');

class NativeFS extends NativeModule {
  constructor(options) {
    super();

    this.commands = ['read', 'write'];
    this._mutex = new Set();
    this._lastInQueue = new Map();
    /**
     * Stop the whole process (cleanup).
     */
    this._stop = false;

    // Create the data files folder if it doesn't exist yet
    this.path = (options && options.dir) || __dirname;
    try {
      fs.statSync(`${this.path}/data_files/`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return fs.mkdirSync(`${this.path}/data_files/`);
      }
      throw err;
    }

    // Unpublish on exit
    exitHook(async () => {
      this._stop = true;
      // Await all ongoing writes but don't schedule new ones.
      await Promise.all(Array.from(this._lastInQueue.values()));
    });
  }

  executeCommand(command, args, send) {
    if (this._stop) {
      return undefined;
    }

    if (command === 'read') {
      return this.read(args);
    }
    if (command === 'write') {
      return this.write(args, send);
    }
    return undefined;
  }

  async read(args) {
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

    const [key] = args;

    let table = key;

    // cut out given attribute in json file
    if (key.indexOf('.json') !== -1) {
      table = key.substr(0, key.indexOf('.json'));
    }

    // Check mutex
    if (this._mutex.has(table)) {
      // Wait till previous operations on this key finished.
      await this._freeQueue(promisedResponse, table);
    }

    // Block resource
    // TODO: this is a temporary fix
    // PROBLEM: we want to block writes from happening while one or more reads are happening but this also blocks more than one read from happening
    // SOLUTION 1: Have Objects that get updated here which get occasionally written to the file system => reads are atomic reads of Object attributes
    // SOLUTION 2: Read-Write-Lock, Reads block only writes and writes block everything
    if (!this._lastInQueue.has(table)) {
      this._lastInQueue.set(table, promisedResponse);
    }
    this._mutex.add(table);

    if (key.indexOf('.json/') !== -1) {
      // send given attribute in a json file
      const filename = key.substr(0, key.lastIndexOf('/'));
      const id = key.substr(key.lastIndexOf('/') + 1);
      fs.readFile(`${this.path}/data_files/${filename}`, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            succeed([null]);
          } else {
            fail(err);
          }
          return;
        }
        // File is JSON with key-value-objects as elements
        const file = JSON.parse(data);
        // Send null if no value
        const value = file[id] !== undefined ? file[id] : null;
        succeed([value]);
      });
    } else {
      // No attribute in a json file given, so send the whole file or fileNames of given directory
      const fullPath = `${this.path}/data_files/${key}`;
      if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
        // send fileNames of given directory
        fs.readdir(fullPath, { withFileTypes: false }, (err, files) => {
          if (err) {
            if (err.code === 'ENOENT') {
              succeed([null]);
            } else {
              fail(err);
            }
            return;
          }
          succeed([files]);
        });
      } else {
        // send whole file
        fs.readFile(fullPath, (err, data) => {
          if (err) {
            if (err.code === 'ENOENT') {
              succeed([null]);
            } else {
              fail(err);
            }
            return;
          }
          // Check if given file is json and parse data if so
          let file = data;

          if (key.indexOf('.json') !== -1) {
            file = JSON.parse(data);
          } else if (key.indexOf('.bpmn') !== -1) {
            file = file.toString();
          }

          succeed([file]);
        });
      }
    }
    return promisedResponse;
  }

  async write(args) {
    const [key, value] = args;
    // TODO: Improve (now key and value are inconsistent)
    // Different forms of keys currently used:
    // definitionId/config.json/attribute - value: 123
    // definitionId/config.json/log - value: '{enabled: true, logLevel: 'info'}'
    // definitionId/config.json/attribute - value: null   (=> delete attribute)
    // definitionId/config.json - value: null   (=> delete whole file)
    // definitionId/definitionId.bpmn - value: bpmn-xml
    // definitionId/images/imageFileName.jpg - value: jpg-file

    let table = key;

    // cut out given attribute in json file
    if (key.indexOf('.json') !== -1) {
      table = key.substr(0, key.indexOf('.json'));
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
      // delete given attribute inside json
      if (key.indexOf('.json/') !== -1) {
        const filename = key.substr(0, key.lastIndexOf('/'));
        const id = key.substr(key.lastIndexOf('/') + 1);
        const fullPath = `${this.path}/data_files/${filename}`;

        fs.readFile(fullPath, (err, data) => {
          let newFile = false;
          if (err && err.code === 'ENOENT') {
            newFile = true;
          } else if (err) {
            fail(err);
            return;
          }
          // File is JSON with key-value-objects as elements
          const file = newFile ? {} : JSON.parse(data);
          delete file[id];
          fs.writeFile(fullPath, JSON.stringify(file), (err2) => {
            if (err2) {
              fail(err2);
              return;
            }
            succeed();
          });
        });
      } else {
        // delete file (or directory) if no json with specific attribute inside is given
        const fullPath = `${this.path}/data_files/${key}`;
        fs.rm(fullPath, { recursive: true, force: true }, (err) => {
          if (err) {
            fail(err);
            return;
          }
          succeed();
        });
      }
      // New val
    } else {
      // add/change given attribute in a json file
      if (key.indexOf('.json/') !== -1) {
        const filename = key.substr(0, key.lastIndexOf('/'));
        const id = key.substr(key.lastIndexOf('/') + 1);
        const fullPath = `${this.path}/data_files/${filename}`;

        const fileDir = fullPath.substr(0, fullPath.lastIndexOf('/'));

        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        fs.readFile(fullPath, (err, data) => {
          let newFile = false;
          if (err && err.code === 'ENOENT') {
            newFile = true;
          } else if (err) {
            fail(err);
            return;
          }

          // File is JSON with key-value-objects as elements
          const file = newFile ? {} : JSON.parse(data);
          file[id] = value;
          fs.writeFile(fullPath, JSON.stringify(file), (err2) => {
            if (err2) {
              fail(err2);
              return;
            }
            succeed();
          });
        });
      } else {
        // add/replace whole file with new value
        const fullPath = `${this.path}/data_files/${key}`;
        const fileDir = fullPath.substr(0, fullPath.lastIndexOf('/'));

        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        fs.writeFile(fullPath, value, (err) => {
          if (err) {
            fail(err);
            return;
          }
          succeed();
        });
      }
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

module.exports = NativeFS;
