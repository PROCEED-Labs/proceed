const NativeModule = require('@proceed/native-module');
const Koa = require('koa');
const cors = require('@koa/cors');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const Busboy = require('busboy');
const stoppable = require('stoppable');

class NativeExpress extends NativeModule {
  constructor() {
    super();
    this.router = new Router();
    this.commands = ['serve', 'respond', 'setPort', 'unsetPort'];
    this._responses = new Map();
    this.app = new Koa();
    this.app.use(this.router.routes()).use(this.router.allowedMethods());
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
      this.router.options(path, cors());
    }
    this.router[method](path, (ctx) => {
      let ready;
      const rdyPromise = new Promise((resolve) => {
        ready = resolve;
      });

      let corsPromise = Promise.resolve();
      if (options.cors) {
        corsPromise = new Promise((resolve) => {
          cors()(ctx, () => resolve());
        });
      }

      let filesPromise = Promise.resolve([]);
      // TODO: remove this since we only use JSON as data format for
      // implementation simplicity

      if ((method === 'post' || method === 'put') && options.files) {
        filesPromise = new Promise((resolve) => {
          const busboy = new Busboy({ headers: ctx.req.headers });
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
          ctx.req.pipe(busboy);
        });
      } else if (method === 'post' || method === 'put') {
        filesPromise = new Promise((resolve) => {
          bodyParser({ jsonLimit: '100mb' })(ctx, () => resolve());
        });
      }

      Promise.all([corsPromise, filesPromise])
        .then((values) => {
          const files = values[1];
          const proceedReq = {
            hostname: ctx.hostname,
            ip: ctx.ip, // TODO: necessary?
            method: ctx.method,
            params: ctx.params,
            query: ctx.query,
            path: ctx.path,
            body: ctx.request.body,
            files,
          };

          // TODO: other method (same as system module)
          const uniqueResId = String(Math.random());
          this._responses.set(uniqueResId, [ctx, ready]);

          // resID to identify the res object once the response comes in.
          send(null, [uniqueResId, proceedReq]);
        })
        .catch((e) => console.log(e));

      return rdyPromise;
    });
  }

  respond(args) {
    const [res, resID, statusCode, mimeType] = args;
    const [response, ready] = this._responses.get(resID);
    response.type = mimeType || 'json';
    response.status = statusCode;
    response.body = res || '';
    ready();
    this._responses.delete(resID);
  }
}

module.exports = NativeExpress;
