const { Raspistill } = require('node-raspistill');

/**
 * @module Raspberry3-Camera
 */

/**
 * IoT Service of taking a photo using Raspistill.
 * @param {array} args The arguments passed to this function
 * @param {function} callback The callback to call when the function finished executing
 */
function takePhoto(args, callback) {
  const defaultArgs = {
    nofilesave: true, // change if you want to save the photo locally
    height: 350,
    width: 700,
    encoding: 'jpg',
    time: 1,
  };
  // Init camera
  const camera = new Raspistill({ ...defaultArgs, ...{} });
  // Take a photo
  camera.takePhoto().then((photo) => {
    let base64String = 'data:image/jpg;base64,';
    base64String += Buffer.from(photo, 'hex').toString('base64');
    callback([null, base64String]);
  });
}

module.exports = takePhoto;
