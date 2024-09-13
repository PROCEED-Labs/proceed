import { PackedRulesForUser, computeRulesForUser } from './caslRules';
import Ability from '../ability/abilityHelper';
import { LRUCache } from 'lru-cache';
import { TreeMap } from '../ability/caslAbility';
import { getFolders } from '../data/legacy/folders';
import { getEnvironmentById } from '../data/legacy/iam/environments';
import { getRoleMappingByUserId } from '../data/legacy/iam/role-mappings';
import { getAppliedRolesForUser } from './organizationEnvironmentRolesHelper';
import { env } from '../env-vars';
import { MSEnabledResources } from './globalRules';

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
  // let userRules = getCachedRulesForUser(userId, environmentId);

  // TODO remove this line
  // cached rules aren't being correctly removed after roles are updated
  let userRules = undefined;

  if (userRules) return userRules;

  const space = getEnvironmentById(environmentId);

  if (!space.organization) {
    const { rules, expiration } = computeRulesForUser({ userId, space });
    cacheRulesForUser(userId, environmentId, rules, expiration);
    return rules;
  }

  if (space.active) {
    const roles = getAppliedRolesForUser(userId, environmentId);
    // TODO: get bough features from db

    const getPurhasedFeatures = (_: string) => [];

    const purchasedResources = getPurhasedFeatures(environmentId).filter((resource) =>
      MSEnabledResources.includes(resource as any),
    );

    const { rules, expiration } = computeRulesForUser({ userId, space, roles, purchasedResources });
    cacheRulesForUser(userId, environmentId, rules, expiration);
    return rules;
  }

  // Non active organization
  return [];
}

export async function getAbilityForUser(userId: string, environmentId: string) {
  const spaceFolderTree = getSpaceFolderTree(environmentId);
  const userRules = await getUserRules(userId, environmentId);

  return new Ability(userRules, environmentId, spaceFolderTree);
}
