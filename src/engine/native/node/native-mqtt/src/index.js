const NativeModule = require('@proceed/native-module');
const mqtt = require('async-mqtt');

class NativeMQTT extends NativeModule {
  constructor() {
    super();
    this.commands = ['messaging_publish'];
  }

  async executeCommand(command, args) {
    if (command === 'messaging_publish') {
      return await this.publish(args);
    }
    return undefined;
  }

  async publish(args) {
    let [url, topic, message, messageOptions, connectionOptions] = args;

    messageOptions = JSON.parse(messageOptions || '{}');
    connectionOptions = JSON.parse(connectionOptions || '{}');

    url = new URL(url);
    // the url might contain login information => get that information from the url and put it into the connection options
    connectionOptions.username = url.username || connectionOptions.username;
    connectionOptions.password = url.password || connectionOptions.password;
    delete url.username;
    delete url.password;
    url = url.toString();

    // connect to the mqtt server using optional parameters like username and password
    const client = await mqtt.connectAsync(url, {
      clean: true, // don't reuse an earlier connection
      ...connectionOptions,
    });

    /**
     * send the message with optional parameters like qos
     *
     * qos 0: The message is sent only once and there is no checking if it actually arrived
     * qos 1: The message is sent until an acknowledgement is received; it might arrive multiple times
     * qos 2: The message is sent in a way that ensures that it arrives exactly once
     */
    await client.publish(topic, message, { qos: 2, ...messageOptions });
    // close the connection
    await client.end();
  }
}

module.exports = NativeMQTT;
