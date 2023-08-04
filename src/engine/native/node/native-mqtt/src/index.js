const NativeModule = require('@proceed/native-module');
const mqtt = require('async-mqtt');

class NativeMQTT extends NativeModule {
  constructor() {
    super();
    this.commands = [
      'messaging_publish',
      'messaging_connect',
      'messaging_disconnect',
      'messaging_subscribe',
      'messaging_unsubscribe',
    ];

    this.connections = {};
  }

  async executeCommand(command, args, send) {
    if (command === 'messaging_publish') {
      return await this.publish(...args);
    }
    if (command === 'messaging_connect') {
      await this.connect(...args, true);
    }
    if (command === 'messaging_disconnect') {
      await this.disconnect(...args, true);
    }
    if (command === 'messaging_subscribe') {
      await this.subscribe(...args, send);
    }
    if (command === 'messaging_unsubscribe') {
      await this.unsubscribe(...args);
    }
    return undefined;
  }

  /**
   * A helper function that ensures that we have necessary information in the correct places
   *
   * url: We need the log-in information in the url to differentiate between different sessions on the same mqtt broker
   * connectionOptions: we need the log-in information in the connectOptions for the mqtt library to be able to use it
   *
   * Log-in information might come from two different places (will be used in the following order):
   *
   * 1. user provided info in the url
   * 2. info in the connectionOptions
   *    2a. user provides info in the connectionOptions object
   *    2b. default info from the engine config (universal part will write this into the connectionOptions if there is no user provided config info)
   *
   * Options to define log in information:
   *
   * 1. no url info/no user config/no engine config => no log-in info                                                                    => log-in without any authentification
   * 2. no url info/no user config/engine config    => universal part will autocomplete with engine config                               => log-in with engine config values
   * 3. no url info/user config   /no engine config => no universal autocompletion; completion of the url in this function               => log-in with user config values
   * 4. no url info/user config   /engine config    => no universal autocompletion; completion of the url in this function               => log-in with user config values
   * 5. url info   /no user config/no engine config => no universal autocompletion; completion of the connectionOptions in this function => log-in with url info
   * 6. url info   /no user config/engine config    => universal part will autocomplete with engine config; this functions overrides     => log-in with url info
   * 7. url info   /user config   /no engine config => no universal autocompletion; url info will be used before user config info        => log-in with url info
   * 8. url info   /user config   /engine config    => no universal autocompletion; url info will be used before user config info        => log-in with url info
   *
   * @param {String} url
   * @param {Object} connectionOptions the current connection option; BEWARE: this might be changed if there is log-in information in the url
   * @returns {String} the url with log-in information
   */
  _extendUrlAndConnectionOptions(url, connectionOptions) {
    url = new URL(url);
    // the url might contain login information => get that information from the url and put it into the connection options
    // (this will override the auth information in the connectionOptions if there is auth data in the url)
    connectionOptions.username = url.username || connectionOptions.username;
    connectionOptions.password = url.password || connectionOptions.password;

    // either keep the auth info in the url or add the info from the options object if there is none in the url
    // (will be used to identify a connection by user if there are mutliple connections to the same address)
    url.username = url.username || connectionOptions.username || '';
    url.password = url.password || connectionOptions.password || '';
    return url.toString();
  }

  /**
   * Returns a connection to the mqtt broker with the given address using the given log-in information
   *
   * Creates a new connection if no connection is open for the combination of address and log-in information
   *
   * @param {String} url
   * @param {String} connectionOptions
   * @param {Boolean} keepOpen if the connection can be automatically cleaned up after a publish or if it should be kept
   * @returns {Object} the connection
   */
  async connect(url, connectionOptions, keepOpen) {
    connectionOptions = JSON.parse(connectionOptions || '{}');
    url = this._extendUrlAndConnectionOptions(url, connectionOptions);

    // check if there is already a connection for the given url
    // extendUrlAndConnectionOptions(...) will put the user auth into the url so we can differentiate between connections with different auth data to the same mqtt broker
    if (this.connections[`${url}-${connectionOptions.clientId}`]) {
      return this.connections[`${url}-${connectionOptions.clientId}`];
    }

    // if the connectionOptions contains a will message that is a stringified JSON (the mqtt library expect the payload to be a string) the JSON.parse at the start of the function will have transformed it to an object
    if (connectionOptions.will && typeof connectionOptions.will.payload === 'object') {
      connectionOptions.will.payload = JSON.stringify(connectionOptions.will.payload);
    }

    // connect to the mqtt server using optional parameters like username and password
    const client = await mqtt.connectAsync(url, {
      clean: true, // don't reuse an earlier connection
      ...connectionOptions,
    });

    // set this flag to ensure that the connection is not automatically cleaned up after a publish
    client.keepOpen = keepOpen;

    // used to remember named subscriptions to enable unsubscribing functionality
    client.subscriptionCallbacks = {};
    // handle incoming messages by calling the correct subscription callbacks
    client.on('message', (incomingTopic, message) => {
      Object.entries(client.subscriptionCallbacks).forEach(([topic, callbacks]) => {
        // filter the incoming messages for the ones this subscription is interested in
        let topicRegex = `^${topic}$`; // prevent matching of topics that contain our topic string somewhere "in the middle" (e.g. topic = test/topic, incomingTopic = root/test/topic should not be a match)
        topicRegex = topicRegex.replace(/\+/g, '[^/]+'); // allow matching of one topic level per + symbol
        topicRegex = topicRegex.replace(/(\/)?#\$/, '(|$1.*)$'); // allow matching of multiple topic levels (including 0) for a # symbol at the end

        if (incomingTopic.match(topicRegex)) {
          Object.values(callbacks).forEach((callback) =>
            callback(undefined, [incomingTopic, message.toString()])
          );
        }
      });
    });

    // store the client so we don't try to reconnect for future publish or subscribe calls
    this.connections[`${url}-${connectionOptions.clientId}`] = client;

    return client;
  }

  /**
   * Will close a connection to an mqtt broker if it exists
   *
   * @param {String} url
   * @param {String} connectionOptions should contain the log-in information that the connection was opened with to identify the correct connection
   * @param {Boolean} forceClose will close a connection even if it is set to be kept open
   */
  async disconnect(url, connectionOptions, forceClose) {
    connectionOptions = JSON.parse(connectionOptions || '{}');
    url = this._extendUrlAndConnectionOptions(url, connectionOptions);

    // get the connection that was stored for this address and login info combination
    const client = this.connections[`${url}-${connectionOptions.clientId}`];

    if (client) {
      const hasSubscriptions = Object.keys(client.subscriptionCallbacks).length;

      if (forceClose || (!client.keepOpen && !hasSubscriptions)) {
        // close the connection and remove it
        await client.end();
        delete this.connections[`${url}-${connectionOptions.clientId}`];
      }
    }
  }

  async publish(url, topic, message, messageOptions, connectionOptions) {
    const client = await this.connect(url, connectionOptions);

    messageOptions = JSON.parse(messageOptions || '{}');

    /**
     * send the message with optional parameters like qos
     *
     * qos 0: The message is sent only once and there is no checking if it actually arrived
     * qos 1: The message is sent until an acknowledgement is received; it might arrive multiple times
     * qos 2: The message is sent in a way that ensures that it arrives exactly once
     */
    await client.publish(topic, message, { qos: 2, ...messageOptions });

    await this.disconnect(url, connectionOptions);
  }

  /**
   * Allows subscriptions to topics on a mqtt broker
   *
   * @param {String} url
   * @param {String} topic
   * @param {String} connectionOptions
   * @param {String} subscriptionOptions contains a subscription id that is used when the user wants to unsubscribe from the topic
   * @param {Function} send callback that should be called every time that a message that matches the given topic string is received
   */
  async subscribe(url, topic, connectionOptions, subscriptionOptions, send) {
    subscriptionOptions = JSON.parse(subscriptionOptions);

    const connection = await this.connect(url, connectionOptions);

    await connection.subscribe(topic, {
      qos: 2, // default to qos 2 (ensures exactly one receival)
      ...subscriptionOptions, // allow user defined options (e.g. qos 0/1)
      subscriptionId: undefined, // the subscriptionId is only for our internal logic and should not be passed to async-mqtt
    });

    // remember the subscription so we are able to unsubscribe in the future
    if (!connection.subscriptionCallbacks[topic]) connection.subscriptionCallbacks[topic] = {};
    connection.subscriptionCallbacks[topic][subscriptionOptions.subscriptionId] = send;
  }

  /**
   * Allows removal of subscriptions
   *
   * @param {String} originalUrl the url that was given when the subscription was made
   * @param {String} topic the topic that was subscribed to with the subscriptions
   * @param {String} subscriptionId identifier to uniquely identify the original subscription (we might have multiple subscriptions to the same topic on the same broker)
   * @param {String} originalConnectionOptions the connection options given with the subscription (username, password and clientId)
   */
  async unsubscribe(originalUrl, topic, subscriptionId, originalConnectionOptions) {
    let connectionOptions = JSON.parse(originalConnectionOptions || '{}');
    let url = this._extendUrlAndConnectionOptions(originalUrl, connectionOptions);

    if (this.connections[`${url}-${connectionOptions.clientId}`]) {
      const connection = this.connections[`${url}-${connectionOptions.clientId}`];
      if (
        !connection.subscriptionCallbacks[topic] ||
        !connection.subscriptionCallbacks[topic][subscriptionId]
      ) {
        return;
      }

      // remove the handler for the incoming messages
      delete connection.subscriptionCallbacks[topic][subscriptionId];

      // only unsubscribe if all local subscriptions have been removed (there is only one subscription per topic on the connection)
      if (!Object.keys(connection.subscriptionCallbacks[topic]).length) {
        await connection.unsubscribe(topic);
        delete connection.subscriptionCallbacks[topic];
      }

      // try to clean up the connection (will do nothing if the connection is kept open by another subscription or for another reason [e.g a will message])
      await this.disconnect(originalUrl, originalConnectionOptions);
    }
  }
}

module.exports = NativeMQTT;
