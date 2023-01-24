/**
 * @module Espruino-Wifi-Access-Point
 */

/**
 * IoT Service providing an access point.
 * @memberof Capabilities.Functions
 * @param {array} args The arguments passed to this function
 * @param {function} callback The callback to call when the function finished executing
 */
function startAccessPoint(args, callback) {
  var wifi = require('Wifi');
  var password = args.password;
  var authMode = args.authMode;
  var accessPoint = 'EspruinoAP';

  wifi.startAP(accessPoint, { password: password, authMode: authMode }, function (err) {
    if (err) {
      callback([err, { success: false }]);
    }
    callback([null, { success: true }]);
  });
}

module.exports = startAccessPoint;
