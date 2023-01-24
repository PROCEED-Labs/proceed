const { network, timer } = require('@proceed/system');
const { config } = require('@proceed/machine');
const router = require('./routes/router');
const dbAPI = require('./database/db');
const communication = require('./communication/src/communication');

/**
 * @module @proceed/distribution
 */
const distribution = {
  db: dbAPI,
  communication,

  async init(management) {
    // start discovery of engines in the network with mDNS
    communication.init();
    // Start endpoints
    router(management);
  },

  async publish() {
    await communication.publish();
  },

  async unpublish() {
    await communication.unpublish();
  },
};

module.exports = distribution;
