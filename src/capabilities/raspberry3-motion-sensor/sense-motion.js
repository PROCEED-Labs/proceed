const { Gpio } = require('onoff');
const motionSensor = new Gpio(17, 'in', 'both');

/**
 * @module Raspberry3-Motion-Sensor
 */

/**
 * IoT Service of sensing a motion.
 * @param {array} args The arguments passed to this function
 * @param {function} callback The callback to call when the function finished executing
 */
function senseMotion(args, callback) {
  motionSensor.watch((err, value) => {
    if (err) {
      callback([err]);
      return;
    }
    if (value === 1) {
      callback([null]);
    }
  });
}

process.on('SIGINT', () => {
  motionSensor.unexport();
});

module.exports = senseMotion;
