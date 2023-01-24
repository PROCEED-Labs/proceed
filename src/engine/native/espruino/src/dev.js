/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */

const engine = require('../modules/engine');

class customIPC extends engine.IPC {
  emit(...params) {
    console.log(params);
  }
}

const options = {};
engine.init(options, new customIPC());
