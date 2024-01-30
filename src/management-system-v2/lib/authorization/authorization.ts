import { PackedRulesForUser, computeRulesForUser } from './caslRules';
import Ability from '../ability/abilityHelper';
import { LRUCache } from 'lru-cache';

type PackedRules = PackedRulesForUser['rules'];

const rulesCache =
  // @ts-ignore
  (global.rulesCache as LRUCache<string, PackedRules>) ||
  // @ts-ignore
  (global.rulesCache = new LRUCache<string, PackedRules>({
    max: 500,
    allowStale: false,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  }));

export function deleteCachedRulesForUser(userId: string, environmentId?: string) {
  const cacheId = `${userId}:${environmentId}` as const;

  rulesCache.delete(cacheId);
}

export function rulesCacheDeleteAll() {
  rulesCache.clear();
}

export function cacheRulesForUser(
  userId: string,
  environmentId: string,
  rules: PackedRules,
  expiration?: PackedRulesForUser['expiration'],
) {
  const cacheId = `${userId}:${environmentId}` as const;

  if (expiration) {
    // TODO ttl is reset on get, it isn't a security issue since abilities check themselves if they're expired
    // but it still should be fixed
    const ttl = Math.round(+expiration - Date.now());
    rulesCache.set(cacheId, rules, { ttl });
  } else {
    rulesCache.set(cacheId, rules);
  }
}

function getCachedRulesForUser(userId: string, environmentId: string) {
  const cacheId = `${userId}:${environmentId}` as const;

  return rulesCache.get(cacheId);
}

/**
 * Get a user's applied rules for a given environment.
 * If no environmentId is specified, the user's personal environment is used.
 * */
export async function getUserRules(userId: string, environmentId: string) {
  // let userRules = getCachedRulesForUser(userId, environmentId);

  // TODO remove this line
  // cached rules aren't being correctly removed after roles are updated
  let userRules = undefined;

  if (userRules === undefined) {
    const { rules, expiration } = await computeRulesForUser(userId, environmentId);
    cacheRulesForUser(userId, environmentId, rules, expiration);
    userRules = rules;
  }

  return userRules;
}

export async function getAbilityForUser(userId: string, environmentId: string) {
  const userRules = await getUserRules(userId, environmentId);
  const userAbility = new Ability(userRules, environmentId);
  return userAbility;
}
