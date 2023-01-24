const { network } = require('@proceed/system');
const { version } = require('../../../../native/node/package.json');

/**
 * @param {*} path = /status
 */
module.exports = (path) => {
  network.get(`${path}/`, { cors: true }, async () => JSON.stringify({ running: true, version }));
};
