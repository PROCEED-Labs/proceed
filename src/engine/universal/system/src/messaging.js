/* eslint-disable class-methods-use-this */
const { System } = require('./system');
const utils = require('./utils.ts');

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Messaging extends System {
  constructor() {
    super();
    // the messaging server that messages should be sent to if no override is given to the publish method
    this._defaultMessagingServerAddress = undefined;
    // the username with which the engine will authenticate itself if no other is given
    this._username = undefined;
    // the password the engine will use for authentication if no other is given
    this._password = undefined;
    // the machineId that identifies the engine and is used for the default topic prefix (/engine/[machineId]/[topic])
    this._machineId = undefined;

    // publish requests that were made before the module was completely initialized (should be done after initializitation was completed)
    this._preInitPublishQueue = [];

    // if the module has been initialized with the required data
    this._initialized = false;
  }

  /**
   * Allows setting some default values that can be used when connecting with messaging servers or sending messages
   *
   * @param {String} defaultAddress
   * @param {String} defaultUsername
   * @param {String} defaultPassword
   * @param {String} machineId
   */
  async init(defaultAddress, defaultUsername, defaultPassword, machineId) {
    this._defaultMessagingServerAddress = defaultAddress;
    this._username = defaultUsername;
    this._password = defaultPassword;
    this._machineId = machineId;

    this._initialized = true;
    // send all messages that were queued to wait until the module was initialized
    for (const queuedMessage of this._preInitPublishQueue) {
      await this.publish(...queuedMessage);
    }

    this._preInitPublishQueue = [];
  }

  /**
   * Will add login information if it is missing from the connection options
   *
   * @param {Object} connectionOptions
   */
  _completeLoginInfo(connectionOptions) {
    // implicitly use the default username and password unless the options explicitly define them (including as empty strings)
    connectionOptions.username =
      connectionOptions.username === undefined ? this._username : connectionOptions.username;
    connectionOptions.password =
      connectionOptions.password === undefined ? this._password : connectionOptions.password;
    // always add the machine id to show that the message is coming from this engine
    connectionOptions.clientId = this._machineId;
  }

  /**
   * Publish some data through a messaging server
   *
   * @param {String} topic the topic under which the data should be published (e.g. engine/[engine-id]/status)
   * @param {String|Object} message the data that should be published
   * @param {String} overrideUrl address of the messaging server if the default one should not be used
   * @param {Object} options options that should be used when publishing the message
   * @param {Number} options.qos mqtt: defines how the message is sent (0: no checking if it arrived, 1: sent until receiving an acknowledgement but it might arrive mutliple times, 2: sent in a way that ensures that the message arrives exactly once)
   * @param {Boolean} options.retain mqtt: defines if the message should be stored for and be sent to users that might connect or subscribe to the topic after it has been sent
   * @param {Object} connectionOptions options that should be used when connecting to the messaging server to send the message
   * @param {String} connectionOptions.username the username to use when connecting
   * @param {String} connectionOptions.password the password to use when connecting
   */
  async publish(
    topic,
    message,
    overrideUrl = this._defaultMessagingServerAddress,
    messageOptions = {},
    connectionOptions = {}
  ) {
    // if no url is given use the default url if one was set
    const url = overrideUrl || this._defaultMessagingServerAddress;

    if (!this._initialized) {
      // enqueue any messages that cannot be published because the module is not intialized yet (other modules need to be initialized before this one but their initialization can trigger publish requests)
      this._preInitPublishQueue.push([
        topic,
        message,
        overrideUrl,
        messageOptions,
        connectionOptions,
      ]);
      return;
    }

    if (!url) {
      // silently ignore the message if there is no address to send the data to (messaging address was not set in the config so messaging is not required)
      return;
    }

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

    // prepends the default topic path "engine/[engine-id]" to the topic
    // this way all modules in the engine can just call publish with prefixDefaultTopic to publish under one topic instead of having to import the machineInfo and rebuild the topic path themselves
    if (messageOptions.prefixDefaultTopic) {
      topic = `engine/${this._machineId}/${topic}`;
    }

    // make sure that everything is in the correct format to be passed to the native part
    if (typeof message !== 'string') message = JSON.stringify(message);
    messageOptions = JSON.stringify(messageOptions);
    this._completeLoginInfo(connectionOptions);
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
