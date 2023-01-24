/**
 * @module urlParser
 * @memberof module:@proceed/capabilities.module:parser
 */

/**
 * @function
  A Function that parses the URI to its domain and actions form
  @param {string} uri
  @returns {string} parsed uri
*/
module.exports = (uri) => {
  if (uri.includes('#')) {
    return uri.split('/').pop().replace(/#/i, ':');
  }
  const domain = uri.match(/\/\/(.*)\./).pop();
  const action = uri.split('/').pop();
  return `${domain}:${action}`;
};
