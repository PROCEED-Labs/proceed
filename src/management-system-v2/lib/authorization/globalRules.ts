// The rules in this file will be applied to all abilities
// By default everything is allowed and these rules restrict access

import { AbilityRule, resourceAction } from '../ability/caslAbility';

type SystemRules = (AbilityRule & { inverted: true })[];

//TODO read global rules from config file

export const globalOrganizationRules = [] satisfies SystemRules;

export const globalUserRules = [
  {
    inverted: true,
    action: [...resourceAction],
    subject: ['Role', 'RoleMapping', 'User', 'Machine', 'Execution', 'EnvConfig'],
  },
] satisfies SystemRules;
