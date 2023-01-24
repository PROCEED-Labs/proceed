const NativeModule = require('@proceed/native-module');
const express = require('express');
const cors = require('cors');
const Busboy = require('busboy');
const bodyParser = require('body-parser');
const stoppable = require('stoppable');

class NativeExpress extends NativeModule {
  constructor() {
    super();
    this.commands = ['serve', 'respond', 'setPort', 'unsetPort'];
    this._responses = new Map();
    this.app = express();
    this.server = null;
  }

  executeCommand(command, args, send) {
    if (command === 'serve') {
      return this.serve(args, send);
    }
    if (command === 'respond') {
      return this.respond(args);
    }
    if (command === 'setPort') {
      return this.setPort(args);
    }
    if (command === 'unsetPort') {
      return this.unsetPort();
    }
    return undefined;
  }

  async setPort(args) {
    const [port] = args;

    if (!port) {
      throw new Error('No port given.');
    }
    this.server = this.app.listen(port);
    stoppable(this.server);
  }

  async unsetPort() {
    if (this.server) {
      this.server.stop(() => {
        this.server = null;
      });
    }
  }

  serve(args, send) {
    const [method, path, options] = args;

    if (options.cors) {
      this.app.options(path, cors());
    }
    this.app[method](path, (req, res) => {
      let corsPromise = Promise.resolve();
      if (options.cors) {
        corsPromise = new Promise((resolve) => {
          cors()(req, res, () => resolve());
        });
      }

      let filesPromise = Promise.resolve([]);
      // TODO: remove this since we only use JSON as data format for
      // implementation simplicity
      if ((method === 'post' || method === 'put') && options.files) {
        filesPromise = new Promise((resolve) => {
          const busboy = new Busboy({ headers: req.headers });
          const files = [];
          busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            let fileData = '';
            file.on('data', (data) => {
              fileData += data;
            });
            file.on('end', () => {
              console.log('file end');
              files.push({ name: fieldname, data: fileData });
            });
          });
          busboy.on('finish', () => {
            console.log('bb finish');
            resolve(files);
          });
          req.pipe(busboy);
        });
      } else if (method === 'post' || method === 'put') {
        filesPromise = new Promise((resolve) => {
          bodyParser.json({ limit: '100mb' })(req, res, () => resolve());
        });
      }

      Promise.all([corsPromise, filesPromise])
        .then((values) => {
          const files = values[1];
          const proceedReq = {
            hostname: req.hostname,
            ip: req.ip, // TODO: necessary?
            method: req.method,
            params: req.params,
            query: req.query,
            path: req.path,
            body: req.body,
            files,
          };

          // TODO: other method (same as system module)
          const uniqueResId = String(Math.random());
          this._responses.set(uniqueResId, res);

          // resID to identify the res object once the response comes in.
          send(null, [uniqueResId, proceedReq]);
        })
        .catch((e) => console.log(e));
    });
  }

  respond(args) {
    const [res, resID, statusCode, mimeType] = args;
    const response = this._responses.get(resID);
    response.type(mimeType || 'json');
    response.status(statusCode).send(res);
    this._responses.delete(resID);
  }
}

module.exports = NativeExpress;
