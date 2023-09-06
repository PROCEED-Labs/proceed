import { config } from '../utils/config.js';
import { PackedRules, adminRules, rulesForUser } from '../authorization/caslRules';
import Ability from '../authorization/abilityHelper';

import Redis from 'ioredis';

const abilityCache = new Redis(config.redisRulesPort || 6380, config.redisHost || 'localhost', {
  password: config.redisPassword || 'password',
});

/* const abilityCache = new LRUCache<string, Ability>({
  max: 500,
}); */

export async function deleteRulesForUsers(userId: string) {
  await abilityCache.del(userId);
}

export async function abilityCacheDeleteAll() {
  await abilityCache.flushdb();
}

export async function setRulesForUser(userId: string, rules: PackedRules, expiration?: Date) {
  if (expiration) {
    const secondsToExpiration = Math.round((+expiration - Date.now()) / 1000);
    await abilityCache.set(userId, JSON.stringify(rules), 'EX', secondsToExpiration);
  } else {
    await abilityCache.set(userId, JSON.stringify(rules));
  }
}

export async function getRulesForUser(userId: string): Promise<PackedRules | undefined> {
  try {
    const rulesJson = await abilityCache.get(userId);
    if (rulesJson === null) return undefined;
    return JSON.parse(rulesJson);
  } catch (e) {
    return undefined;
  }
}

export async function abilityMiddleware(req: any, res: any, next: any) {
  if (!config.useAuthorization) {
    req.userAbility = new Ability(adminRules());
    return next();
  }

  const userId = req.session.userId || '';

  let userRules = await getRulesForUser(userId);

  if (userRules === undefined) {
    const { rules, expiration } = await rulesForUser(userId);
    setRulesForUser(userId, rules, expiration);
    userRules = rules;
  }

  req.userAbility = new Ability(userRules);

  return next();
}

export const isAllowed = (...abilityArgs: Parameters<Ability['can']>) => {
  return async (req, res, next) => {
    // skip middleware if authorization disabled
    if (!config.useAuthorization) {
      return next();
    }

    const ability = req.userAbility as Ability;

    if (ability.can(...abilityArgs)) return next();

    return res.status(403).send('Forbidden');
  };
};

/**
 * check if user is authenticated
 */
export const isAuthenticated = () => {
  return async (req, res, next) => {
    // skip middleware
    if (!config.useAuthorization) {
      return next();
    }

    if (req.session && req.session.userId) {
      return next();
    } else {
      return res.status(401).send('Unauthenticated');
    }
  };
};
