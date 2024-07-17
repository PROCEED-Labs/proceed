// The rules in this file will be applied to all abilities
// By default everything is allowed and these rules restrict access

import { packRules } from '@casl/ability/extra';
import { AbilityRule, ResourceType, resourceAction, resources } from '../ability/caslAbility';
import { env } from '../env-vars';

const realResources = resources.filter((resource) => resource !== 'All');
export const MSEnabledResources = env.MS_ENABLED_RESOURCES ?? resources;

function getRulesForTargetResources(targetResources: readonly ResourceType[]) {
  const enabledResources = targetResources.filter((resource) =>
    MSEnabledResources.includes(resource),
  );

  const disabledResources = realResources.filter(
    (resource) => !enabledResources.includes(resource),
  );
  return [
    {
      inverted: true,
      action: [...resourceAction],
      subject: [...disabledResources],
    },
  ] satisfies AbilityRule[];
}

export const globalOrganizationRules = getRulesForTargetResources(MSEnabledResources);
export const packedGlobalOrganizationRules = packRules<AbilityRule>(globalOrganizationRules);

export const globalPersonalSpaceRules = getRulesForTargetResources([
  'Process',
  'Folder',
] satisfies ResourceType[]);
export const packedGlobalUserRules = packRules<AbilityRule>(globalPersonalSpaceRules);
