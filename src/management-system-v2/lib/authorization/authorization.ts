import { PackedRulesForUser, computeRulesForUser } from './caslRules';
import Ability from '../ability/abilityHelper';
import { LRUCache } from 'lru-cache';
import { TreeMap } from '../ability/caslAbility';
import { getFolders } from '../data/legacy/folders';
import { getEnvironmentById } from '../data/legacy/iam/environments';
import { getAppliedRolesForUser } from './organizationEnvironmentRolesHelper';

type PackedRules = PackedRulesForUser['rules'];

const rulesCache =
  // @ts-ignore
  (global.rulesCache as LRUCache<string, PackedRules>) ||
  // @ts-ignore
  (global.rulesCache = new LRUCache<string, PackedRules>({
    max: 500,
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
  }));

export function getCachedRulesForUser(userId: string, environmentId: string) {
  return rulesCache.get(`${userId}:${environmentId}`);
}

export function cacheRulesForUser(
  userId: string,
  environmentId: string,
  rules: PackedRules,
  expiration?: PackedRulesForUser['expiration'],
) {
  const cacheId = `${userId}:${environmentId}` as const;

  if (expiration) {
    const ttl = Math.round(+expiration - Date.now());
    rulesCache.set(cacheId, rules, { ttl });
  } else {
    rulesCache.set(cacheId, rules);
  }
}

export function deleteCachedRulesForUser(userId: string, environmentId?: string) {
  rulesCache.delete(`${userId}:${environmentId}`);
}

export function rulesCacheDeleteAll() {
  rulesCache.clear();
}

export function getSpaceFolderTree(spaceId: string) {
  const tree: TreeMap = {};

  for (const folder of getFolders(spaceId)) {
    if (folder.parentId) tree[folder.id] = folder.parentId;
  }

  return tree;
}

/**
 * Get a user's applied rules for a given environment.
 * If no environmentId is specified, the user's personal space is used.
 * */
export async function getUserRules(userId: string, environmentId: string) {
  let userRules = getCachedRulesForUser(userId, environmentId);

  if (!userRules) {
    const space = getEnvironmentById(environmentId);
    const roles =
      space.organization && space.active ? getAppliedRolesForUser(userId, environmentId) : [];

    const { rules, expiration } = computeRulesForUser({ userId, space, roles });
    cacheRulesForUser(userId, environmentId, rules, expiration);
    userRules = rules;
  }

  return userRules as NonNullable<typeof userRules>;
}

export async function getAbilityForUser(userId: string, environmentId: string) {
  const spaceFolderTree = getSpaceFolderTree(environmentId);
  const userRules = await getUserRules(userId, environmentId);

  return new Ability(userRules, environmentId, spaceFolderTree);
}
