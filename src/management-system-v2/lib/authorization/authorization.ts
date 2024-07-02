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

const folderTreeCache =
  // @ts-ignore
  (global.folderTreeCache as LRUCache<string, TreeMap>) ||
  // @ts-ignore
  (global.folderTreeCache = new LRUCache<string, TreeMap>({ max: 500 }));

export function getCachedFolderTree(spaceId: string) {
  return folderTreeCache.get(spaceId);
}

export function cacheFolderTree(spaceId: string, tree: TreeMap) {
  folderTreeCache.set(spaceId, tree);
}

export function deleteCachedFolderTree(spaceId: string) {
  folderTreeCache.delete(spaceId);
}

export function getSpaceFolderTree(spaceId: string) {
  let tree = getCachedFolderTree(spaceId);

  if (!tree) {
    tree = {} as TreeMap;
    for (const folder of getFolders(spaceId)) {
      if (folder.parentId) tree[folder.id] = folder.parentId;
    }

    cacheFolderTree(spaceId, tree);
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

  return userRules;
}

export async function getAbilityForUser(userId: string, environmentId: string) {
  const spaceFolderTree = getSpaceFolderTree(environmentId);
  const userRules = await getUserRules(userId, environmentId);

  return new Ability(userRules, environmentId, spaceFolderTree);
}
