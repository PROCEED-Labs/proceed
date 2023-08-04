jest.mock('async-mqtt');

const NativeMQTT = require('../index.js');

const mqtt = require('async-mqtt');

describe('Native-MQTT', () => {
  let nativeMQTT;
  let mockConnections = [];
  beforeEach(() => {
    nativeMQTT = new NativeMQTT();
    jest.clearAllMocks();
    mockConnections = [];
    mqtt.connectAsync.mockImplementation(async (_url, opts) => {
      const connection = {
        ...opts,
        eventHandlers: {},
        publish: jest.fn(),
        end: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        eventNames: jest.fn().mockImplementation(function () {
          return Object.keys(this.eventHandlers);
        }),
        on: jest.fn().mockImplementation(function (eventName, callback) {
          let currentHandlers = this.eventHandlers[eventName];
          this.eventHandlers[eventName] = !currentHandlers
            ? [callback]
            : [...currentHandlers, callback];
        }),
        off: jest.fn().mockImplementation(function (eventName, callback) {
          if (!this.eventHandlers[eventName]) return;
          this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
            (el) => el !== callback
          );
          if (!this.eventHandlers[eventName].length) delete this.eventHandlers[eventName];
        }),
        receiveMessage: jest.fn().mockImplementation(function (topic, message) {
          if (this.eventHandlers['message']) {
            this.eventHandlers['message'].forEach((handler) => handler(topic, message));
          }
        }),
      };
      mockConnections.push(connection);
      return connection;
    });
  });

  describe('messaging_connect', () => {
    it('will call the connection function of the mqtt library with the given attributes', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(mqtt.connectAsync).toHaveBeenCalledWith(
        `mqtt://test-user:password123@localhost:1883`,
        // the clean attribute is always set to signal that we don't want to reuse connection info from the last time we were connected
        { username: 'test-user', password: 'password123', clean: true }
      );
    });

    it('will keep the connection open and not try to open a new one if we try to connect with the same parameters', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123","clientId":"engineId"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883-engineId': {
          username: 'test-user',
          password: 'password123',
          clientId: 'engineId',
          clean: true,
          eventHandlers: { message: [expect.any(Function)] },
          eventNames: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          end: expect.any(Function),
          publish: expect.any(Function),
          subscribe: expect.any(Function),
          unsubscribe: expect.any(Function),
          receiveMessage: expect.any(Function),
          keepOpen: true,
          subscriptionCallbacks: {},
        },
      });
      const [firstConnection] = Object.values(nativeMQTT.connections);

      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123","clientId":"engineId"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(nativeMQTT.connections['mqtt://test-user:password123@localhost:1883-engineId']).toBe(
        firstConnection
      );
    });

    it('will open a new connection when a different address is requested', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123","clientId":"engineId"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883-engineId': {
          username: 'test-user',
          password: 'password123',
          clientId: 'engineId',
          clean: true,
          eventHandlers: { message: [expect.any(Function)] },
          eventNames: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          end: expect.any(Function),
          publish: expect.any(Function),
          subscribe: expect.any(Function),
          unsubscribe: expect.any(Function),
          receiveMessage: expect.any(Function),
          keepOpen: true,
          subscriptionCallbacks: {},
        },
      });
      const [firstConnection] = Object.values(nativeMQTT.connections);

      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://other-address:1883',
        '{"username":"test-user","password":"password123","clientId":"engineId"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(2);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883-engineId': firstConnection,
        'mqtt://test-user:password123@other-address:1883-engineId': {
          username: 'test-user',
          password: 'password123',
          clientId: 'engineId',
          clean: true,
          eventHandlers: { message: [expect.any(Function)] },
          eventNames: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          end: expect.any(Function),
          publish: expect.any(Function),
          subscribe: expect.any(Function),
          unsubscribe: expect.any(Function),
          receiveMessage: expect.any(Function),
          keepOpen: true,
          subscriptionCallbacks: {},
        },
      });
    });

    it('will open a new connection when a different client id is used', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123","clientId":"engineId"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883-engineId': {
          username: 'test-user',
          password: 'password123',
          clientId: 'engineId',
          clean: true,
          eventHandlers: { message: [expect.any(Function)] },
          eventNames: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          end: expect.any(Function),
          publish: expect.any(Function),
          subscribe: expect.any(Function),
          unsubscribe: expect.any(Function),
          receiveMessage: expect.any(Function),
          keepOpen: true,
          subscriptionCallbacks: {},
        },
      });
      const [firstConnection] = Object.values(nativeMQTT.connections);

      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123","clientId":"otherId"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(2);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883-engineId': firstConnection,
        'mqtt://test-user:password123@localhost:1883-otherId': {
          username: 'test-user',
          password: 'password123',
          clientId: 'otherId',
          clean: true,
          eventHandlers: { message: [expect.any(Function)] },
          eventNames: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          end: expect.any(Function),
          publish: expect.any(Function),
          subscribe: expect.any(Function),
          unsubscribe: expect.any(Function),
          receiveMessage: expect.any(Function),
          keepOpen: true,
          subscriptionCallbacks: {},
        },
      });
    });

    it('will open a new connection when different log-in info is used', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123","clientId":"engineId"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883-engineId': {
          username: 'test-user',
          password: 'password123',
          clientId: 'engineId',
          clean: true,
          eventHandlers: { message: [expect.any(Function)] },
          eventNames: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          end: expect.any(Function),
          publish: expect.any(Function),
          subscribe: expect.any(Function),
          unsubscribe: expect.any(Function),
          receiveMessage: expect.any(Function),
          keepOpen: true,
          subscriptionCallbacks: {},
        },
      });
      const [firstConnection] = Object.values(nativeMQTT.connections);

      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"other-user","password":"password456","clientId":"engineId"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(2);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883-engineId': firstConnection,
        'mqtt://other-user:password456@localhost:1883-engineId': {
          username: 'other-user',
          password: 'password456',
          clientId: 'engineId',
          clean: true,
          eventHandlers: { message: [expect.any(Function)] },
          eventNames: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          end: expect.any(Function),
          publish: expect.any(Function),
          subscribe: expect.any(Function),
          unsubscribe: expect.any(Function),
          receiveMessage: expect.any(Function),
          keepOpen: true,
          subscriptionCallbacks: {},
        },
      });
    });
  });

  describe('messaging_disconnect', () => {
    it('will close an existing connection and remove it from the connection list', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      const [connection] = Object.values(nativeMQTT.connections);

      await nativeMQTT.executeCommand('messaging_disconnect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(0);
      expect(connection.end).toHaveBeenCalled();
    });

    it('will do nothing if there is no connection for the given address', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://otherAddress:1883',
        '{"username":"test-user","password":"password123"}',
      ]);
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"other-user","password":"password123"}',
      ]);
      const [connection1, connection2] = Object.values(nativeMQTT.connections);
      await expect(
        nativeMQTT.executeCommand('messaging_disconnect', [
          'mqtt://localhost:1883',
          '{"username":"test-user","password":"password123"}',
        ])
      ).resolves.not.toThrow();

      expect(Object.keys(nativeMQTT.connections).length).toBe(2);
      expect(connection1.end).not.toHaveBeenCalled();
      expect(connection2.end).not.toHaveBeenCalled();
    });
  });

  describe('messaging_publish', () => {
    it('will try to send a message to the requested mqtt server', async () => {
      await nativeMQTT.executeCommand('messaging_publish', [
        'mqtt://localhost:1883',
        'test/topic',
        'Hello World!',
        '{"retain":true, "qos": 1}',
        '{"username":"test-user","password":"password123"}',
      ]);
      // should have called the mqtt function to create a connection and used that connection to send the message
      expect(mqtt.connectAsync).toHaveBeenCalledWith(
        'mqtt://test-user:password123@localhost:1883',
        { username: 'test-user', password: 'password123', clean: true }
      );
      expect(mockConnections.length).toBe(1);
      expect(mockConnections[0].publish).toHaveBeenCalledWith('test/topic', 'Hello World!', {
        retain: true,
        qos: 1,
      });
      // should have called the end function on the connection to close it again
      expect(mockConnections[0].end).toHaveBeenCalled();
    });

    it('will reuse an already opened connection if called with matching connection options and not close it afterwards', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      // should have called the mqtt function to create a connection and used that connection to send the message
      expect(mqtt.connectAsync).toHaveBeenCalledTimes(1);
      const [connection] = Object.values(nativeMQTT.connections);
      await nativeMQTT.executeCommand('messaging_publish', [
        'mqtt://localhost:1883',
        'test/topic',
        'Hello World!',
        '{"retain":true, "qos": 1}',
        '{"username":"test-user","password":"password123"}',
      ]);
      // should NOT have called the mqtt function to create a connection but reused the existing connection to send the message
      expect(mqtt.connectAsync).toBeCalledTimes(1);
      expect(mockConnections.length).toBe(1);
      expect(mockConnections[0]).toBe(connection);

      expect(connection.publish).toHaveBeenCalledWith('test/topic', 'Hello World!', {
        retain: true,
        qos: 1,
      });

      // should NOT have called the end function on the connection
      expect(connection.end).not.toHaveBeenCalled();
    });

    it('will default to sending a message with qos level 2 if no specific qos level is requested', async () => {
      await nativeMQTT.executeCommand('messaging_publish', [
        'mqtt://localhost:1883',
        'test/topic',
        'Hello World!',
        '{}',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(mockConnections[0].publish).toHaveBeenCalledWith('test/topic', 'Hello World!', {
        qos: 2,
      });
    });
  });

  describe('messaging_subscribe', () => {
    it('will try to subscribe to the given topic on the requested mqtt server', async () => {
      await nativeMQTT.executeCommand('messaging_subscribe', [
        'mqtt://localhost:1883',
        'test/topic',
        '{"username":"test-user","password":"password123"}',
        '{"subscriptionId": 123}',
      ]);
      // should have called the mqtt function to create a connection and subscribed to the topic on that connection
      expect(mqtt.connectAsync).toHaveBeenCalledWith(
        'mqtt://test-user:password123@localhost:1883',
        { username: 'test-user', password: 'password123', clean: true }
      );
      expect(mockConnections.length).toBe(1);
      expect(mockConnections[0].subscribe).toHaveBeenCalledWith('test/topic', { qos: 2 });
      // should NOT have called the end function on the connection
      expect(mockConnections[0].end).not.toHaveBeenCalled();
    });

    it('will create a connection that is not cleaned up by a publish on the same connection', async () => {
      await nativeMQTT.executeCommand('messaging_subscribe', [
        'mqtt://localhost:1883',
        'test/topic',
        '{"username":"test-user","password":"password123"}',
        '{"subscriptionId": 123}',
      ]);
      // should have called the mqtt function to create a connection and subscribed to the topic on that connection
      expect(mqtt.connectAsync).toHaveBeenCalledWith(
        'mqtt://test-user:password123@localhost:1883',
        { username: 'test-user', password: 'password123', clean: true }
      );
      expect(mockConnections.length).toBe(1);
      expect(mockConnections[0].subscribe).toHaveBeenCalledWith('test/topic', { qos: 2 });

      await nativeMQTT.executeCommand('messaging_publish', [
        'mqtt://localhost:1883',
        'test/topic',
        'Hello World!',
        '{}',
        '{"username":"test-user","password":"password123"}',
      ]);
      // should NOT have called the end function on the connection
      expect(mockConnections[0].end).not.toHaveBeenCalled();
    });

    it('will call the given callback with data sent to the topic that was subscribed to', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('test/topic', 'Hello World!');

      expect(callback).toHaveBeenCalledWith(undefined, ['test/topic', 'Hello World!']);
    });

    it('will not call the callback when a message on another topic that was also subscribed to comes in', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('test/other-topic', 'Hello World!');

      expect(callback).not.toHaveBeenCalled();
    });

    it('can handle subscriptions using single level wildcard at the end', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/+',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('test/topic', 'Hello World!');
      connection.receiveMessage('root/test/topic', 'Hello World!'); // starts with another topic => not matched
      connection.receiveMessage('test/other-topic', 'Hello World!');
      connection.receiveMessage('test/a', 'Hello World!');
      connection.receiveMessage('other-topic/a', 'Hello World!'); // different topic path => not matched
      connection.receiveMessage('test/multi/level', 'Hello World!'); // is a level too deep => not matched

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/topic', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/other-topic', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/a', 'Hello World!']);
    });

    it('can handle subscriptions using single level wildcard in the middle', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/+/abc',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('test/topic/abc', 'Hello World!');
      connection.receiveMessage('root/test/topic/abc', 'Hello World!'); // starts with another topic => not matched
      connection.receiveMessage('test/other-topic/abc', 'Hello World!');
      connection.receiveMessage('test/a/abc', 'Hello World!');
      connection.receiveMessage('other-topic/a/abc', 'Hello World!'); // different topic path => not matched
      connection.receiveMessage('test/multi/level/abc', 'Hello World!'); // has too many levels for the single level wildcard => not matched

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/topic/abc', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/other-topic/abc', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/a/abc', 'Hello World!']);
    });

    it('can handle subscriptions using multi level wildcard (only allowed at the end)', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/#',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('test/topic/abc', 'Hello World!');
      connection.receiveMessage('root/test/topic/abc', 'Hello World!'); // starts with another topic => not matched
      connection.receiveMessage('test/other-topic/abc', 'Hello World!');
      connection.receiveMessage('test/a/abc', 'Hello World!');
      connection.receiveMessage('other-topic/a/abc', 'Hello World!'); // different topic path => not matched
      connection.receiveMessage('test/multi/level', 'Hello World!');
      connection.receiveMessage('test', 'Hello World!');
      connection.receiveMessage('test/', 'Hello World!');
      connection.receiveMessage('test123/', 'Hello World!');
      connection.receiveMessage('test123', 'Hello World!');

      expect(callback).toHaveBeenCalledTimes(6);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/topic/abc', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/other-topic/abc', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/a/abc', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/multi/level', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['test/', 'Hello World!']);
    });

    it('can handle root level subscriptions without a preceding slash', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          '#',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('test/topic/abc', 'Hello World!');
      connection.receiveMessage('root/test/topic/abc', 'Hello World!');
      connection.receiveMessage('test/other-topic/abc', 'Hello World!');
      connection.receiveMessage('test/a/abc', 'Hello World!');
      connection.receiveMessage('other-topic/a/abc', 'Hello World!');
      connection.receiveMessage('test/multi/level', 'Hello World!');
      connection.receiveMessage('test', 'Hello World!');
      connection.receiveMessage('test/', 'Hello World!');
      connection.receiveMessage('test123/', 'Hello World!');
      connection.receiveMessage('test123', 'Hello World!');

      expect(callback).toHaveBeenCalledTimes(10);
    });

    it('can handle root level subscriptions with a preceding slash', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          '/#',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('/test/topic/abc', 'Hello World!');
      connection.receiveMessage('/root/test/topic/abc', 'Hello World!');
      connection.receiveMessage('/test/other-topic/abc', 'Hello World!');
      connection.receiveMessage('/test/a/abc', 'Hello World!');
      connection.receiveMessage('other-topic/a/abc', 'Hello World!'); // does not start with a slash => not matched
      connection.receiveMessage('test/multi/level', 'Hello World!'); // does not start with a slash => not matched
      connection.receiveMessage('test', 'Hello World!'); // does not start with a slash => not matched
      connection.receiveMessage('test/', 'Hello World!'); // does not start with a slash => not matched
      connection.receiveMessage('test123/', 'Hello World!'); // does not start with a slash => not matched
      connection.receiveMessage('test123', 'Hello World!'); // does not start with a slash => not matched

      expect(callback).toHaveBeenCalledTimes(4);
      expect(callback).toHaveBeenCalledWith(undefined, ['/test/topic/abc', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['/root/test/topic/abc', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['/test/other-topic/abc', 'Hello World!']);
      expect(callback).toHaveBeenCalledWith(undefined, ['/test/a/abc', 'Hello World!']);
    });
  });

  describe('messaging_unsubscribe', () => {
    it('will remove an existing subsription', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('test/topic', 'Hello World!');
      expect(callback).toHaveBeenCalledTimes(1);

      await nativeMQTT.executeCommand('messaging_unsubscribe', [
        'mqtt://localhost:1883',
        'test/topic',
        123,
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(connection.unsubscribe).toHaveBeenCalledWith('test/topic');

      connection.receiveMessage('test/topic', 'Hello World!');
      // should not have called the callback another time
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('will only remove the subscription from the client when all local subscriptions from the topic were removed', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback1
      );

      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 456}',
        ],
        callback2
      );

      const [connection] = Object.values(nativeMQTT.connections);

      connection.receiveMessage('test/topic', 'Hello World!');
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      await nativeMQTT.executeCommand('messaging_unsubscribe', [
        'mqtt://localhost:1883',
        'test/topic',
        123,
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(connection.unsubscribe).not.toHaveBeenCalled();

      connection.receiveMessage('test/topic', 'Hello World!');
      // should not have called the callback another time
      expect(callback1).toHaveBeenCalledTimes(1);
      // should have called the callback another time
      expect(callback2).toHaveBeenCalledTimes(2);

      await nativeMQTT.executeCommand('messaging_unsubscribe', [
        'mqtt://localhost:1883',
        'test/topic',
        456,
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(connection.unsubscribe).toHaveBeenCalledWith('test/topic');

      connection.receiveMessage('test/topic', 'Hello World!');
      // should not have called the callback another time
      expect(callback1).toHaveBeenCalledTimes(1);
      // should not have called the callback another time
      expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('will remove a connection that was created for the subscription', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      await nativeMQTT.executeCommand('messaging_unsubscribe', [
        'mqtt://localhost:1883',
        'test/topic',
        123,
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(connection.unsubscribe).toHaveBeenCalledWith('test/topic');
      expect(connection.end).toHaveBeenCalled();
      expect(Object.keys(nativeMQTT.connections).length).toBe(0);
    });

    it('will not remove a connection that is still needed for other subscriptions', async () => {
      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/other-topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 456}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      await nativeMQTT.executeCommand('messaging_unsubscribe', [
        'mqtt://localhost:1883',
        'test/topic',
        123,
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(connection.unsubscribe).toHaveBeenCalledWith('test/topic');
      expect(connection.end).not.toHaveBeenCalled();
      expect(Object.values(nativeMQTT.connections)).toStrictEqual([connection]);
    });

    it('will not remove a connection that was explicitly opened', async () => {
      await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      const callback = jest.fn();
      await nativeMQTT.executeCommand(
        'messaging_subscribe',
        [
          'mqtt://localhost:1883',
          'test/topic',
          '{"username":"test-user","password":"password123"}',
          '{"subscriptionId": 123}',
        ],
        callback
      );

      const [connection] = Object.values(nativeMQTT.connections);

      await nativeMQTT.executeCommand('messaging_unsubscribe', [
        'mqtt://localhost:1883',
        'test/topic',
        123,
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(connection.unsubscribe).toHaveBeenCalledWith('test/topic');
      expect(connection.end).not.toHaveBeenCalled();
      expect(Object.values(nativeMQTT.connections)).toStrictEqual([connection]);
    });
  });
});
