import { PackRule, unpackRules } from '@casl/ability/extra';
import {
  AbilityRule,
  CaslAbility,
  ResourceType,
  buildAbility,
  toCaslResource,
} from './caslAbility';

type CanParams = Parameters<CaslAbility['can']>;

export default class Ability {
  caslAbility: CaslAbility;

  constructor(packedRules: PackRule<AbilityRule>[]) {
    this.caslAbility = buildAbility(unpackRules(packedRules));
  }

  can(action: CanParams[0] | CanParams[0][], resource: CanParams[1], field?: CanParams[2]) {
    if (typeof action === 'string') return this.caslAbility.can(action, resource, field);

    for (const subAction of action)
      if (!this.caslAbility.can(subAction, resource, field)) return false;

    return true;
  }

  filter<T extends {}>(action: CanParams[0] | CanParams[0][], resource: ResourceType, array: T[]) {
    return array.filter((resourceInstance) =>
      this.can(action, toCaslResource(resource, resourceInstance)),
    ) as T[];
  }

  checkInputFields(
    resourceObj: any,
    action: CanParams[0] | CanParams[0][],
    input: any,
    prefix: string = '',
  ) {
    if (typeof input !== 'object' || input === null) return this.can(action, resourceObj, prefix);

    for (const key of Object.keys(input)) {
      if (
        !this.checkInputFields(resourceObj, action, input[key], `${prefix}${prefix && '.'}${key}`)
      )
        return false;
    }

    return true;
  }
}
