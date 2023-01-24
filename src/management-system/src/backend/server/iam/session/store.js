import Redis from 'ioredis';
import session from 'express-session';
import store from 'connect-redis';

export const createSessionStore = async (config) => {
  const redisClient = new Redis(config.redisPort || 6379, config.redisHost || 'localhost', {
    password: config.redisPassword || 'password',
  });

  const RedisStore = store(session);

  return new RedisStore({ client: redisClient });
};
