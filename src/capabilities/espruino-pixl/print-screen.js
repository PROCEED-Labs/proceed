/**
 * @module Espruino-Pixl-Screen
 */

/**
 * IoT Service of printing a message to a Espruino Pixl.
 * @memberof Capabilities.Functions
 * @param {array} args The arguments passed to this function
 * @param {function} callback The callback to call when the function finished executing
 */
function printScreen(args, callback) {
  Terminal.println(args.value);
  callback(null);
}

module.exports = printScreen;
