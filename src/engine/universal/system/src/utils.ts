const uuid = require('uuid/v4');

module.exports = {
  generateUniqueTaskID() {
    return uuid();
  },
};
