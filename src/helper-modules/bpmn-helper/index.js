const util = require('./src/util.js');

const getters = require('./src/getters.js');

const setters = require('./src/setters.js');

const validators = require('./src/validators.js');

const proceedConstants = require('./src/PROCEED-CONSTANTS.js');

const proceedExtensions = require('./src/proceedExtensions');

module.exports = {
  ...util,
  ...getters,
  ...setters,
  ...validators,
  ...proceedConstants,
  ...proceedExtensions,
};
