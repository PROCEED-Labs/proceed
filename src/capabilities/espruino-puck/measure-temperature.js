/**
 * @module Espruino-Puck-Temperature
 */

/**
 * IoT Service of measuring the temperature.
 * @memberof Capabilities.Functions
 * @param {array} args The arguments passed to this function
 * @param {function} callback The callback to call when the function finished executing
 */
function measureTemperature(args, callback) {
  const temperature = E.getTemperature();
  callback([null, temperature]);
}

module.exports = measureTemperature;
