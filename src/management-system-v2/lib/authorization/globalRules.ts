// The rules in this file will be applied to all abilities
// By default everything is allowed and these rules restrict access

import { packRules } from '@casl/ability/extra';
import { AbilityRule, resourceAction } from '../ability/caslAbility';
import { RemoveReadOnly } from '../typescript-utils';

type SystemRules = (AbilityRule & { inverted: true })[];

//TODO read global rules from config file

export const globalOrganizationRules = Object.freeze([] satisfies SystemRules);
export const packedGlobalOrganizationRules = packRules<AbilityRule>(
  globalOrganizationRules as RemoveReadOnly<typeof globalOrganizationRules>,
);

export const globalUserRules = Object.freeze([
  {
    inverted: true,
    action: [...resourceAction],
    subject: ['Role', 'RoleMapping', 'Machine', 'Execution', 'EnvConfig', 'User', 'Environment'],
  },
] satisfies SystemRules);
export const packedGlobalUserRules = packRules<AbilityRule>(
  globalUserRules as RemoveReadOnly<typeof globalUserRules>,
);
