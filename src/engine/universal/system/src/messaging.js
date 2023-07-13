/* eslint-disable class-methods-use-this */
const { System } = require('./system.ts');
const { generateUniqueTaskID } = require('./utils.ts');

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

    // topic that is prepended to publish and subscribe calls as the start of a default topic prefix if requested
    this._baseTopic = '';

    // the machineId that identifies the engine and is used for the default topic prefix ([baseTopic]/engine/[machineId]/[topic])
    this._machineId = undefined;

    // publish requests that were made before the module was completely initialized (should be done after initializitation was completed)
    this._preInitPublishQueue = [];

    // if the module has been initialized with the required data
    this._initialized = false;

    this.subscriptions = {};

    this._logger = null;
  }

  /**
   * Allows setting some default values that can be used when connecting with messaging servers or sending messages
   *
   * @param {String} defaultAddress
   * @param {String} defaultUsername
   * @param {String} defaultPassword
   * @param {String} machineId
   */
  async init(defaultAddress, defaultUsername, defaultPassword, machineId, baseTopic, logger) {
    this._defaultMessagingServerAddress = defaultAddress;
    this._username = defaultUsername;
    this._password = defaultPassword;
    this._baseTopic = baseTopic;
    this._machineId = machineId;

    this._logger = logger;

    this._initialized = true;
    // send all messages that were queued to wait until the module was initialized
    for (const queuedMessage of this._preInitPublishQueue) {
      await this.publish(...queuedMessage);
    }

    this._preInitPublishQueue = [];

    logger.debug('Initialized the messaging module');
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
    // allow the user to define a prefix
    //this is used to allow distinction between engine and MS which would by default get the same client-id on the same system which leads to one being disconnected if the other connects to the same server
    if (connectionOptions.clientIdPrefix)
      connectionOptions.clientId = connectionOptions.clientIdPrefix + connectionOptions.clientId;

    // this serves the same function as the clientIdPrefix but for multiple connections to the same server on the engine or MS with different users
    if (connectionOptions.username) connectionOptions.clientId += `|${connectionOptions.username}`;

    delete connectionOptions.clientIdPrefix;
  }

  /**
   * Create a persistent connection to a messaging server that will be used for future calls to publish if the url and the log-in information matches
   *
   * @param {String} url the address of the messaging server
   * @param {Object} connectionOptions options that should be used when connecting to the messaging server
   * @param {String} [connectionOptions.username] the username to use when connecting
   * @param {String} [connectionOptions.password] the password to use when connecting
   * @param {String} [connectionOptions.clientId] the client identification to use when connecting
   * @param {Object} [connectionOptions.will] a message that should be sent by the server to subscribers when the connection to the messaging server is closes unexpectedly
   * @param {String} connectionOptions.will.topic the topic under which the will message should be published
   * @param {Object} connectionOptions.will.payload the data to publish on disconnect
   * @param {Number} connectionOptions.will.qos see the description on the publish function
   * @param {Boolean} connectionOptions.will.retain see the description on the publish function
   */
  async connect(url, connectionOptions = {}) {
    const taskID = generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response from the native part
      this.commandResponse(taskID, (err, _data) => {
        if (err) {
          reject(`Failed to connect to ${url}: ${err}`);
        } else {
          resolve();
        }

        return true;
      });
    });

    connectionOptions = JSON.stringify(connectionOptions);

    this.commandRequest(taskID, ['messaging_connect', [url, connectionOptions]]);

    return listenPromise;
  }

  /**
   * Close a connection to a messaging server
   *
   * The function requires you to provide the log-in information that was used when connecting to the server to identify the correct connection
   * (we allow multiple connections to the same server with different users)
   *
   * @param {String} url the address of the messaging server
   * @param {Object} connectionOptions options that were used when connecting to the server
   * @param {String} connectionOptions.username the username that was used when connecting
   * @param {String} connectionOptions.password the password that was used when connecting
   * @param {String} connectionOptions.clientId the clientId that was used when connecting
   */
  async disconnect(url, connectionOptions = {}) {
    const taskID = generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response from the native part
      this.commandResponse(taskID, (err, _data) => {
        if (err) {
          reject(`Failed to disconnect from ${url}\n${err}`);
        } else {
          resolve();
        }

        return true;
      });
    });

    connectionOptions = JSON.stringify(connectionOptions);

    this.commandRequest(taskID, ['messaging_disconnect', [url, connectionOptions]]);

    return listenPromise;
  }

  /**
   * Publish some data through a messaging server
   *
   * @param {String} topic the topic under which the data should be published (e.g. process/[process-id])
   * @param {String|Object} message the data that should be published
   * @param {String} overrideUrl address of the messaging server if the default one should not be used
   * @param {Object} messageOptions options that should be used when publishing the message
   * @param {Number} [messageOptions.qos] mqtt: defines how the message is sent (0: no checking if it arrived, 1: sent until receiving an acknowledgement but it might arrive mutliple times, 2: sent in a way that ensures that the message arrives exactly once)
   * @param {Boolean} [messageOptions.retain] mqtt: defines if the message should be stored for and be sent to users that might connect or subscribe to the topic after it has been sent
   * @param {Boolean} [messageOptions.prependBaseTopic] if set to true will prepend [baseTopic]/proceed-pms to the given topic so the message is grouped into a topic with others using the base topic
   * @param {Boolean} [messageOptions.prependEngineTopic] if set to true will prepend [baseTopic]/proceed-pms/engine/[engine-id] to the given topic so the message is grouped into a topic with other engine data
   * @param {Object} connectionOptions options that should be used when connecting to the messaging server to send the message
   * @param {String} [connectionOptions.username] the username to use when connecting
   * @param {String} [connectionOptions.password] the password to use when connecting
   * @param {String} [connectionOptions.clientIdPrefix] can be used to define a prefix for the final clientId (clientIdPrefix + machineId + '|' + username + ':')
   */
  async publish(topic, message, overrideUrl, messageOptions = {}, connectionOptions = {}) {
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

    const taskID = generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response from the native part
      this.commandResponse(taskID, (err, data) => {
        if (err) {
          reject(`Failed to publish to ${url}: ${err}`);
        } else {
          resolve();
        }

        return true;
      });
    });

    // prepends the default topic path "[baseTopic]/proceed-pms/engine/[engine-id]" to the topic
    // this way all modules in the engine can just call publish with prependEngineTopic to publish under one topic instead of having to import the machineInfo and rebuild the topic path themselves
    if (messageOptions.prependEngineTopic) {
      topic = `${this._baseTopic}proceed-pms/engine/${this._machineId}/${topic}`;
    } else if (messageOptions.prependBaseTopic) {
      topic = `${this._baseTopic}proceed-pms/${topic}`;
    }
    delete messageOptions.prependEngineTopic;
    delete messageOptions.prependBaseTopic;

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

  /**
   * Allows the subscription to a topic on a messaging server
   *
   * @param {String} topic the topic to subscribe to
   * @param {Function} callback the function that should be called every time that a new message is published to the topic
   * @param {String} [overrideUrl] the url of the messaging server (defaults to the url in the config if none is given)
   * @param {Object} connectionOptions the connectionOptions to use when connecting to the server (most importantly username and password)
   * @param {Object} subscriptionOptions the subscriptionOptions to use (e.g. in case of mqtt the quality of service to use for the subscription)
   * @throws will throw if no url is given and there is also no url defined in the config
   */
  async subscribe(topic, callback, overrideUrl, connectionOptions = {}, subscriptionOptions = {}) {
    // if no url is given use the default url if one was set
    const url = overrideUrl || this._defaultMessagingServerAddress;

    if (!url) throw new Error('Tried to subscribe to a topic without providing a server address!');

    const taskID = generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      let setupResponseReceived = false;
      // Listen for the response from the native part
      this.commandResponse(taskID, (err, ...data) => {
        if (err) {
          // Reject and close the listener
          reject(`Failed to subscribe to ${url} (Topic: ${topic}): ${err}`);
          return true;
        } else {
          if (!setupResponseReceived) {
            // Resolve and keep the listener open for future responses (incoming messages on the topic)
            resolve();
            setupResponseReceived = true;
          } else {
            callback(...data);
          }
        }
      });
    });

    // adds additional information to the options and serialize them for the ipc call
    subscriptionOptions.subscriptionId = taskID; // we need a way to tell the native part which subscription to remove when we unsubscribe from the topic in the future
    subscriptionOptions = JSON.stringify(subscriptionOptions);
    this._completeLoginInfo(connectionOptions);
    connectionOptions = JSON.stringify(connectionOptions);
    const sessionId = `${connectionOptions.username}|${connectionOptions.password}|${connectionOptions.clientId}`;
    // send the subscription request to the native part
    this.commandRequest(taskID, [
      'messaging_subscribe',
      [url, topic, connectionOptions, subscriptionOptions],
    ]);

    // remember the subscriptionId with the related data so we can use it in a call to unsubscribe
    if (!this.subscriptions[url]) this.subscriptions[url] = {};
    if (!this.subscriptions[url][sessionId]) this.subscriptions[url][sessionId] = {};
    this.subscriptions[url][sessionId][callback] = taskID;

    return listenPromise;
  }

  /**
   * Allows unsubscribing from a topic that was subscribed to before using the subscribe function
   *
   * @param {String} topic the topic that was subscribed to
   * @param {Function} callback the callback that was given to the subscribe function
   * @param {String} [overrideUrl] the server address given to the subscribe function (might be left open to default to the address in the config)
   * @param {Object} connectionOptions the log in information that was used for the subscription
   * @param {String} [connectionOptions.username] the username to use when connecting
   * @param {String} [connectionOptions.password] the password to use when connecting
   * @param {String} [connectionOptions.clientIdPrefix] can be used to define a prefix for the final clientId (clientIdPrefix + machineId + '|' + username + ':')
   */
  async unsubscribe(topic, callback, overrideUrl, connectionOptions = {}) {
    // if no url is given use the default url if one was set
    const url = overrideUrl || this._defaultMessagingServerAddress;

    if (!url)
      throw new Error('Tried to unsubscribe from a topic without providing a server address!');

    // adds additional information to the options and serialize them for the ipc call
    this._completeLoginInfo(connectionOptions);
    connectionOptions = JSON.stringify(connectionOptions);
    const sessionId = `${connectionOptions.username}|${connectionOptions.password}|${connectionOptions.clientId}`;

    if (
      !this.subscriptions[url] ||
      !this.subscriptions[url][sessionId] ||
      !this.subscriptions[url][sessionId][callback]
    ) {
      return;
    }

    const taskID = generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response from the native part
      this.commandResponse(taskID, (err, data) => {
        if (err) {
          reject(`Failed to unsubscribe from ${url} (Topic: ${topic})\n${err}`);
        } else {
          // remove the subscriptionId and do some clean up
          delete this.subscriptions[url][sessionId][callback];
          if (!Object.keys(this.subscriptions[url][sessionId]).length) {
            delete this.subscriptions[url][sessionId];
          }
          if (!Object.keys(this.subscriptions[url])) delete this.subscriptions[url];
          resolve();
        }

        return true;
      });
    });

    const subscriptionId = this.subscriptions[url][sessionId][callback];

    this.commandRequest(taskID, [
      'messaging_unsubscribe',
      [url, topic, subscriptionId, connectionOptions],
    ]);

    return listenPromise;
  }
}

module.exports = Messaging;
