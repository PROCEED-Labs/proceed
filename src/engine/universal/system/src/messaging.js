/* eslint-disable class-methods-use-this */
const { System } = require('./system');
const utils = require('./utils');

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Messaging extends System {
  /**
   * Publish some data through a messaging server
   *
   * @param {String} url address of the messaging server
   * @param {String} topic the topic under which the data should be published (e.g. engine/[engine-id]/status)
   * @param {String|Object} message the data that should be published
   * @param {Object} options options that should be used when publishing the message
   * @param {Number} options.qos mqtt: defines how the message is sent (0: no checking if it arrived, 1: sent until receiving an acknowledgement but it might arrive mutliple times, 2: sent in a way that ensures that the message arrives exactly once)
   * @param {Boolean} options.retain mqtt: defines if the message should be stored for and be sent to users that might connect or subscribe to the topic after it has been sent
   * @param {Object} connectionOptions options that should be used when connecting to the messaging server to send the message
   * @param {String} connectionOptions.username the username to use when connecting
   * @param {String} connectionOptions.password the password to use when connecting
   */
  async publish(url, topic, message, messageOptions = {}, connectionOptions = {}) {
    const taskID = utils.generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response from the native part
      this.commandResponse(taskID, (err, data) => {
        if (err) {
          reject(`Failed to publish to ${url}\n${err}`);
        } else {
          resolve();
        }

        return true;
      });
    });

    // make sure that everything is in the correct format to be passed to the native part
    if (typeof message !== 'string') message = JSON.stringify(message);
    messageOptions = JSON.stringify(messageOptions);
    connectionOptions = JSON.stringify(connectionOptions);
    // Emit the task
    this.commandRequest(taskID, [
      'messaging_publish',
      [url, topic, message, messageOptions, connectionOptions],
    ]);

    return listenPromise;
  }
}

module.exports = Messaging;
