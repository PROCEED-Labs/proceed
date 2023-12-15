import createConfig, { config as _config } from '../data/legacy/iam/config';
import { PackedRulesForUser, rulesForUser } from './caslRules';
import logger from '../data/legacy/logging';

import Redis from 'ioredis';
import Ability from '../ability/abilityHelper';

const config = _config as any;

let rulesCache: Redis;

export function initialiazeRulesCache(msConfig: typeof config) {
  if (msConfig.useAuthorization)
    rulesCache = new Redis(config.redisPort || 6379, config.redisHost || 'localhost', {
      password: config.redisPassword || 'password',
      db: 1,
    });
}

export async function deleteRulesForUsers(userId: string) {
  await rulesCache.del(userId);
}

export async function abilityCacheDeleteAll() {
  await rulesCache.flushdb();
}

export async function setRulesForUser(
  userId: string,
  rules: PackedRulesForUser['rules'],
  expiration?: PackedRulesForUser['expiration'],
) {
  if (expiration) {
    const secondsToExpiration = Math.round((+expiration - Date.now()) / 1000);
    await rulesCache.set(userId, JSON.stringify(rules), 'EX', secondsToExpiration);
  } else {
    await rulesCache.set(userId, JSON.stringify(rules));
  }
}

export async function getRulesForUser(
  userId: string,
): Promise<PackedRulesForUser['rules'] | undefined> {
  try {
    const rulesJson = await rulesCache.get(userId);
    if (rulesJson === null) return undefined;
    return JSON.parse(rulesJson);
  } catch (e) {
    return undefined;
  }
}

export async function getAbilityForUser(userId: string) {
  let userRules = await getRulesForUser(userId);

  if (userRules === undefined) {
    const { rules, expiration } = await rulesForUser(userId);
    setRulesForUser(userId, rules, expiration);
    userRules = rules;
  }

  const userAbility = new Ability(userRules);
  return userAbility;
}

let msConfig;

try {
  const c = require(
    `../../../management-system/src/backend/server/environment-configurations/${process.env.NODE_ENV}/config_iam.json`,
  );
  msConfig = createConfig(c);
} catch (e) {
  console.log('FAILED', e);
  msConfig = createConfig();
  logger.info('Started MS without Authentication and Authorization.');
}

initialiazeRulesCache(msConfig);
