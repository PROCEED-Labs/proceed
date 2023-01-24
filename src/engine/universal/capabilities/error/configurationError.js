/**
 * @memberof module:@proceed/capabilities
 * @class
  A ConfigurationError Class that occurs when there are
  multiple occurences of the same capability in the capability list
  throws ConfigurationError and message with it.
*/
class ConfigurationError extends Error {
  /**
   * @param {string} message Error message
   */
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

module.exports = {
  ConfigurationError,
};
