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
      const connection = { ...opts, publish: jest.fn(), end: jest.fn() };
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

    it('will keep the connection open and return the same connection if we try to connect with the same parameters', async () => {
      const firstConnection = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883': {
          username: 'test-user',
          password: 'password123',
          clean: true,
          end: expect.any(Function),
          publish: expect.any(Function),
          keepOpen: true,
        },
      });
      expect(nativeMQTT.connections['mqtt://test-user:password123@localhost:1883']).toBe(
        firstConnection
      );

      const secondConnection = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(secondConnection).toBe(firstConnection);
      expect(nativeMQTT.connections['mqtt://test-user:password123@localhost:1883']).toBe(
        firstConnection
      );
    });

    it('will open a new connection when a different address is requested', async () => {
      const firstConnection = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883': {
          username: 'test-user',
          password: 'password123',
          clean: true,
          end: expect.any(Function),
          publish: expect.any(Function),
          keepOpen: true,
        },
      });
      expect(nativeMQTT.connections['mqtt://test-user:password123@localhost:1883']).toBe(
        firstConnection
      );

      const secondConnection = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://other-address:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(2);
      expect(secondConnection).not.toBe(firstConnection);
      expect(nativeMQTT.connections['mqtt://test-user:password123@localhost:1883']).toBe(
        firstConnection
      );
      expect(nativeMQTT.connections['mqtt://test-user:password123@other-address:1883']).toBe(
        secondConnection
      );
    });

    it('will open a new connection when different log-in info is used', async () => {
      const firstConnection = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);
      expect(nativeMQTT.connections).toStrictEqual({
        'mqtt://test-user:password123@localhost:1883': {
          username: 'test-user',
          password: 'password123',
          clean: true,
          end: expect.any(Function),
          publish: expect.any(Function),
          keepOpen: true,
        },
      });
      expect(nativeMQTT.connections['mqtt://test-user:password123@localhost:1883']).toBe(
        firstConnection
      );

      const secondConnection = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"other-user","password":"password456"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(2);
      expect(secondConnection).not.toBe(firstConnection);
      expect(nativeMQTT.connections['mqtt://test-user:password123@localhost:1883']).toBe(
        firstConnection
      );
      expect(nativeMQTT.connections['mqtt://other-user:password456@localhost:1883']).toBe(
        secondConnection
      );
    });
  });

  describe('messaging_disconnect', () => {
    it('will close an existing connection and remove it from the connection list', async () => {
      const connection = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(1);

      await nativeMQTT.executeCommand('messaging_disconnect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      expect(Object.keys(nativeMQTT.connections).length).toBe(0);
      expect(connection.end).toHaveBeenCalled();
    });

    it('will do nothing if there is no connection for the given address', async () => {
      const connection1 = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://otherAddress:1883',
        '{"username":"test-user","password":"password123"}',
      ]);
      const connection2 = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"other-user","password":"password123"}',
      ]);

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
      const connection = await nativeMQTT.executeCommand('messaging_connect', [
        'mqtt://localhost:1883',
        '{"username":"test-user","password":"password123"}',
      ]);

      // should have called the mqtt function to create a connection and used that connection to send the message
      expect(mqtt.connectAsync).toHaveBeenCalledTimes(1);

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
});
