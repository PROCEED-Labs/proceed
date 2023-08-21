jest.mock('../system');

const { System } = require('../system');
const Messaging = require('../messaging');

describe('Tests for the message interface of the dispatcher', () => {
  let messaging;
  // the callback that is registered when the called function waits for a response from the native part
  let ipcCallback;
  beforeEach(() => {
    System.mockClear();

    messaging = new Messaging();

    messaging._defaultMessagingServerAddress = 'mqtt://defaultAddress';
    messaging._machineId = 'machineId';
    messaging._initialized = true;

    // mock the functions that are used inside publish to ensure that publish is awaitable
    messaging.commandResponse.mockImplementation((_id, callback) => {
      ipcCallback = callback;
    });
    messaging.commandRequest.mockImplementation((id, _data) => ipcCallback(null, 'Success'));
  });

  describe('publish', () => {
    it('forwards a request for publishing to the native part', async () => {
      await expect(
        messaging.publish('test/123', 'Hello World', 'mqtt://localhost:1883')
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        ['mqtt://localhost:1883', 'test/123', 'Hello World', '{}', '{"clientId":"machineId"}'],
      ]);
    });

    it('will use a default messaging server if no explicit address is given in the function call', async () => {
      await expect(messaging.publish('test/123', 'Hello World')).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        ['mqtt://defaultAddress', 'test/123', 'Hello World', '{}', '{"clientId":"machineId"}'],
      ]);
    });

    it('will stringify messages that are of an object type', async () => {
      await messaging.publish('test/123', { some: 'data' }, 'mqtt://localhost:1883');

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://localhost:1883',
          'test/123',
          `{\"some\":\"data\"}`,
          '{}',
          '{"clientId":"machineId"}',
        ],
      ]);
    });

    it('will stringify and forward optional message and connection options', async () => {
      await messaging.publish(
        'test/123',
        'Hello World',
        'mqtt://localhost:1883',
        { retain: true },
        { username: 'engine', password: 'password123' }
      );

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://localhost:1883',
          'test/123',
          'Hello World',
          `{\"retain\":true}`,
          `{\"username\":\"engine\",\"password\":\"password123\",\"clientId\":\"machineId|engine\"}`,
        ],
      ]);
    });

    it('throws if the native part returns an error', async () => {
      messaging.commandRequest.mockImplementationOnce((_id, _info) => {
        ipcCallback('Error Message', null);
      });

      await expect(
        messaging.publish('test/123', 'Hello World', 'mqtt://localhost:1883')
      ).rejects.toMatch('Failed to publish to mqtt://localhost:1883: Error Message');
    });

    it('automatically adds default login data (if it is available), if no other login data is given in the connection options', async () => {
      messaging._username = 'user';
      messaging._password = 'password123';
      messaging._machineId = 'engineId';

      await expect(
        messaging.publish('test/123', 'Hello World', 'mqtt://localhost:1883')
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://localhost:1883',
          'test/123',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId|user\"}`,
        ],
      ]);
    });

    it('will not override username and password when they are passed into the function', async () => {
      messaging._username = 'user';
      messaging._password = 'password123';
      messaging._machineId = 'engineId';

      await expect(
        messaging.publish(
          'test/123',
          'Hello World',
          'mqtt://localhost:1883',
          {},
          { username: 'other user', password: 'other password' }
        )
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://localhost:1883',
          'test/123',
          'Hello World',
          '{}',
          `{\"username\":\"other user\",\"password\":\"other password\",\"clientId\":\"engineId|other user\"}`,
        ],
      ]);
    });

    it('allows username and password to be unset if they are set to an empty string', async () => {
      messaging._username = 'user';
      messaging._password = 'password123';
      messaging._machineId = 'engineId';

      await expect(
        messaging.publish(
          'test/123',
          'Hello World',
          'mqtt://localhost:1883',
          {},
          { username: '', password: '' }
        )
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://localhost:1883',
          'test/123',
          'Hello World',
          '{}',
          `{\"username\":\"\",\"password\":\"\",\"clientId\":\"engineId\"}`,
        ],
      ]);
    });

    it('will ignore messages if it is fully initialized but there is no default address and also no address given in the function call', async () => {
      messaging._defaultMessagingServerAddress = undefined;

      messaging.publish('test/123', 'Hello World');

      expect(messaging.commandRequest).not.toHaveBeenCalled();
    });

    it('will queue messages that are published before the module has been initialized', async () => {
      messaging._initialized = false;

      await messaging.publish('test/123', 'Hello World');
      await messaging.publish('test/456', 'Hello World');
      await messaging.publish('test/789', 'Hello World');

      expect(messaging.commandRequest).not.toHaveBeenCalled();

      await messaging.init('mqtt://defaultAddress', 'user', 'password123', 'engineId', '', {
        debug: jest.fn(),
      });

      expect(messaging.commandRequest).toBeCalledTimes(3);
      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://defaultAddress',
          'test/123',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId|user\"}`,
        ],
      ]);
      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://defaultAddress',
          'test/456',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId|user\"}`,
        ],
      ]);
      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://defaultAddress',
          'test/789',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId|user\"}`,
        ],
      ]);
    });

    it('will prefix "[baseTopic]/engine/[engine-id]" to the given topic if requested', async () => {
      messaging._username = 'user';
      messaging._password = 'password123';
      // this is what defines the engine id used in the prefix (will be passed to the messaging module on initialization)
      messaging._machineId = 'engineId';
      messaging._baseTopic = 'base-topic';

      await expect(
        messaging.publish('test/123', 'Hello World', 'mqtt://localhost:1883', {
          prependEngineTopic: true,
        })
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://localhost:1883',
          'base-topic/engine/engineId/test/123',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId|user\"}`,
        ],
      ]);
    });

    it('will prefix "[baseTopic]" to the given topic if requested', async () => {
      messaging._username = 'user';
      messaging._password = 'password123';
      // this is what defines the engine id used in the prefix (will be passed to the messaging module on initialization)
      messaging._machineId = 'engineId';
      messaging._baseTopic = 'base-topic';

      await expect(
        messaging.publish('test/123', 'Hello World', 'mqtt://localhost:1883', {
          prependBaseTopic: true,
        })
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://localhost:1883',
          'base-topic/test/123',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId|user\"}`,
        ],
      ]);
    });
  });

  describe('connect', () => {
    it('will send a command to connect to a messaging server to the backend', async () => {
      await expect(
        messaging.connect('mqtt://localhost:1883', {
          username: 'test-user',
          password: 'password123',
        })
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_connect',
        ['mqtt://localhost:1883', '{"username":"test-user","password":"password123"}'],
      ]);
    });

    it('throws if the native part returns an error', async () => {
      messaging.commandRequest.mockImplementationOnce((_id, _info) => {
        ipcCallback('Error Message', null);
      });

      await expect(messaging.connect('mqtt://localhost:1883')).rejects.toMatch(
        'Failed to connect to mqtt://localhost:1883: Error Message'
      );
    });
  });

  describe('subscribe', () => {
    it('throws if no url is provided and there is no default url in the config', async () => {
      messaging._defaultMessagingServerAddress = undefined;
      await expect(messaging.subscribe('test/topic', () => {})).rejects.toThrow();
    });

    it('will send a command to subscribe to the backend', async () => {
      await expect(
        messaging.subscribe(
          'test/topic',
          () => {},
          'mqtt://some-url',
          { username: 'user', password: 'password456' },
          { qos: 0 }
        )
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_subscribe',
        [
          'mqtt://some-url',
          'test/topic',
          '{"username":"user","password":"password456","clientId":"machineId|user"}',
          expect.stringMatching(/{"qos":0,"subscriptionId":".*"}/),
        ],
      ]);
    });

    it('will use default values if no explicit url and log in information is given', async () => {
      messaging._defaultMessagingServerAddress = 'mqtt://defaultAddress';
      messaging._username = 'user123';
      messaging._password = 'password123';
      messaging._machineId = 'engineId';
      await expect(messaging.subscribe('test/topic', () => {})).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_subscribe',
        [
          'mqtt://defaultAddress',
          'test/topic',
          '{"username":"user123","password":"password123","clientId":"engineId|user123"}',
          expect.stringMatching(/{"subscriptionId":".*"}/),
          ,
        ],
      ]);
    });

    it('throws if the native part returns an error', async () => {
      messaging.commandRequest.mockImplementationOnce((_id, _info) => {
        ipcCallback('Error Message', null);
      });

      await expect(
        messaging.subscribe(
          'test/topic',
          () => {},
          'mqtt://some-url',
          { username: 'user', password: 'password456' },
          { qos: 0 }
        )
      ).rejects.toMatch(
        'Failed to subscribe to mqtt://some-url (Topic: test/topic): Error Message'
      );
    });

    it('will call the given callback when a message is posted on the topic after the subscription', async () => {
      messaging.commandRequest.mockImplementationOnce((_id, _info) => {
        ipcCallback(null, undefined);
      });

      const callback = jest.fn();
      await expect(
        messaging.subscribe(
          'test/topic',
          callback,
          'mqtt://some-url',
          { username: 'user', password: 'password456' },
          { qos: 0 }
        )
      ).resolves.not.toThrow();

      expect(callback).not.toHaveBeenCalled();

      ipcCallback(null, 'test/topic', 'message');
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('test/topic', 'message');
    });
  });

  describe('unsubscribe', () => {
    it('throws if no url is provided and there is no default url in the config', async () => {
      messaging._defaultMessagingServerAddress = undefined;
      await expect(messaging.unsubscribe('test/topic', () => {})).rejects.toThrow();
    });

    it('will do nothing if the given arguments dont match an existing subscription', async () => {
      await expect(
        messaging.unsubscribe('test/topic', () => {}, 'mqtt://some-url', {
          username: 'user',
          password: 'password456',
        })
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).not.toHaveBeenCalled();
    });

    it('will send a command to unsubscribe to the backend', async () => {
      const callback = () => {};
      await expect(
        messaging.subscribe(
          'test/topic',
          callback,
          'mqtt://some-url',
          { username: 'user', password: 'password456' },
          { qos: 0 }
        )
      ).resolves.not.toThrow();

      const { subscriptionId } = JSON.parse(messaging.commandRequest.mock.calls[0][1][1][3]);

      await expect(
        messaging.unsubscribe('test/topic', callback, 'mqtt://some-url', {
          username: 'user',
          password: 'password456',
        })
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_unsubscribe',
        [
          'mqtt://some-url',
          'test/topic',
          subscriptionId,
          '{"username":"user","password":"password456","clientId":"machineId|user"}',
        ],
      ]);
    });

    it('throws if the native part returns an error', async () => {
      messaging.commandRequest.mockImplementationOnce((_id, _info) => {
        ipcCallback(null, 'Subscription Success');
      });

      messaging.commandRequest.mockImplementationOnce((_id, _info) => {
        ipcCallback('Error Message', null);
      });

      const callback = () => {};
      await expect(
        messaging.subscribe(
          'test/topic',
          callback,
          'mqtt://some-url',
          { username: 'user', password: 'password456' },
          { qos: 0 }
        )
      ).resolves.not.toThrow();

      await expect(
        messaging.unsubscribe('test/topic', callback, 'mqtt://some-url', {
          username: 'user',
          password: 'password456',
        })
      ).rejects.toMatch(
        'Failed to unsubscribe from mqtt://some-url (Topic: test/topic)\nError Message'
      );
    });
  });
});
