/**
 * @memberof module:@proceed/capabilities
 * @class
  A NotFoundError Class that occurs when there are
  required format, item or entity is not found during
  the execution of the capability module
*/

class NotFoundError extends Error {
  /**
   * @param {string} message Error message
   */
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

module.exports = {
  NotFoundError,
};
