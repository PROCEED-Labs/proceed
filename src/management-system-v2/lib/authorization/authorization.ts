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

export function deleteCachedRulesForUser(userId: string) {
  rulesCache.delete(userId);
}

export function rulesCacheDeleteAll() {
  rulesCache.clear();
}

export function cacheRulesForUser(
  userId: string,
  rules: PackedRules,
  expiration?: PackedRulesForUser['expiration'],
) {
  if (expiration) {
    // TODO ttl is reset on get, it isn't a security issue since abilities check themselves if they're expired
    // but it still should be fixed
    const ttl = Math.round(+expiration - Date.now());
    rulesCache.set(userId, rules, { ttl });
  } else {
    rulesCache.set(userId, rules);
  }
}

export async function getUserRules(userId: string) {
  let userRules = rulesCache.get(userId);

  if (userRules === undefined) {
    const { rules, expiration } = await computeRulesForUser(userId);
    cacheRulesForUser(userId, rules, expiration);
    userRules = rules;
  }

  return userRules;
}

export async function getAbilityForUser(userId: string) {
  const userRules = await getUserRules(userId);
  const userAbility = new Ability(userRules);
  return userAbility;
}
