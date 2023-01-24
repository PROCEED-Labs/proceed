const { join } = require('path');

/**
 * This will set the directory the chrome version puppeteer needs will be installed to
 *
 * The config is supposed to ensure that chrome is installed in the directory of the app instead of a user denpendent directory
 * as would be the case since puppeteer 19.0.0
 *
 * This will prevent problems that occur when puppeteer is installed with a root user in the Dockerfile but the app is then started with another user
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
