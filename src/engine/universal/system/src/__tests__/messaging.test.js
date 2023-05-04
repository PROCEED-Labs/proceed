jest.mock('../system');

const { System } = require('../system');
const Messaging = require('../messaging');

describe('Tests for the message interface of the dispatcher', () => {
  beforeEach(() => {
    System.mockClear();
  });

  describe('publish', () => {
    let messaging;
    // the callback that is registered when the publish function waits for a response from the native part
    let publishCallback;
    beforeEach(() => {
      messaging = new Messaging();

      messaging._defaultMessagingServerAddress = 'mqtt://defaultAddress';
      messaging._initialized = true;

      // mock the functions that are used inside publish to ensure that publish is awaitable
      messaging.commandResponse.mockImplementation((_id, callback) => {
        publishCallback = callback;
      });
      messaging.commandRequest.mockImplementation((id, _data) => publishCallback(null, 'Success'));
    });

    it('forwards a request for publishing to the native part', async () => {
      await expect(
        messaging.publish('test/123', 'Hello World', 'mqtt://localhost:1883')
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        ['mqtt://localhost:1883', 'test/123', 'Hello World', '{}', '{}'],
      ]);
    });

    it('will use a default messaging server if no explicit address is given in the function call', async () => {
      await expect(messaging.publish('test/123', 'Hello World')).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        ['mqtt://defaultAddress', 'test/123', 'Hello World', '{}', '{}'],
      ]);
    });

    it('will stringify messages that are of an object type', async () => {
      await messaging.publish('test/123', { some: 'data' }, 'mqtt://localhost:1883');

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        ['mqtt://localhost:1883', 'test/123', `{\"some\":\"data\"}`, '{}', '{}'],
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
          `{\"username\":\"engine\",\"password\":\"password123\"}`,
        ],
      ]);
    });

    it('throws if the native part returns an error', async () => {
      messaging.commandRequest.mockImplementationOnce((_id, _info) => {
        publishCallback('Error Message', null);
      });

      await expect(
        messaging.publish('test/123', 'Hello World', 'mqtt://localhost:1883')
      ).rejects.toMatch('Failed to publish to mqtt://localhost:1883\nError Message');
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
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId\"}`,
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
          `{\"username\":\"other user\",\"password\":\"other password\",\"clientId\":\"engineId\"}`,
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

      await messaging.init('mqtt://defaultAddress', 'user', 'password123', 'engineId');

      expect(messaging.commandRequest).toBeCalledTimes(3);
      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://defaultAddress',
          'test/123',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId\"}`,
        ],
      ]);
      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://defaultAddress',
          'test/456',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId\"}`,
        ],
      ]);
      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://defaultAddress',
          'test/789',
          'Hello World',
          '{}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId\"}`,
        ],
      ]);
    });

    it('will prefix "engine/[engine-id]" to the given topic if requested', async () => {
      messaging._username = 'user';
      messaging._password = 'password123';
      // this is what defines the engine id used in the prefix (will be passed to the messaging module on initialization)
      messaging._machineId = 'engineId';

      await expect(
        messaging.publish('test/123', 'Hello World', 'mqtt://localhost:1883', {
          prefixDefaultTopic: true,
        })
      ).resolves.not.toThrow();

      expect(messaging.commandRequest).toHaveBeenCalledWith(expect.any(String), [
        'messaging_publish',
        [
          'mqtt://localhost:1883',
          'engine/engineId/test/123',
          'Hello World',
          '{"prefixDefaultTopic":true}',
          `{\"username\":\"user\",\"password\":\"password123\",\"clientId\":\"engineId\"}`,
        ],
      ]);
    });
  });
});
