// The rules in this file will be applied to all abilities
// By default everything is allowed and these rules restrict access

import { packRules } from '@casl/ability/extra';
import { AbilityRule, ResourceType, resourceAction, resources } from '../ability/caslAbility';
import { env } from '../env-vars';

// NOTE: move this to the feature store once it exists
export const BuyableResources = Object.freeze([] satisfies ResourceType[]);
export type BuyableResource = (typeof BuyableResources)[number];

/**
 * These resources are the ones hat are always allowed for admins, regardless of what additional features where
 * bought for the space.
 */
export const AllowedResourcesForAdmins = Object.freeze(
  env.MS_ENABLED_RESOURCES.filter(
    (resource) => !BuyableResources.includes(resource as BuyableResource),
  ),
);

/**
 * Returns a list of inverted rules for all MS enabled resources, that aren't in targetResources
 */
function getRulesForTargetResources(allowedResources: readonly ResourceType[]) {
  // filter out resources that aren't currently enabled
  allowedResources = allowedResources.filter((resource) =>
    env.MS_ENABLED_RESOURCES.includes(resource),
  );

  const disabledResources = resources.filter((resource) => !allowedResources.includes(resource));
  return [
    {
      inverted: true,
      action: [...resourceAction],
      subject: [...disabledResources],
    },
  ] satisfies AbilityRule[];
}

export const globalOrganizationRules = Object.freeze(
  getRulesForTargetResources(env.MS_ENABLED_RESOURCES),
);
export const packedGlobalOrganizationRules = Object.freeze(
  packRules<AbilityRule>([...globalOrganizationRules]),
);

export const globalPersonalSpaceRules = Object.freeze(
  getRulesForTargetResources(['Process', 'Folder']),
);

export const packedGlobalUserRules = Object.freeze(
  packRules<AbilityRule>([...globalPersonalSpaceRules]),
);

export const adminRules = Object.freeze(
  packRules([
    {
      subject: AllowedResourcesForAdmins,
      action: 'admin',
    },
  ] as AbilityRule[]),
);
