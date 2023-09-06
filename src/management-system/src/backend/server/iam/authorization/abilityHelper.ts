import { PackedRules,toCaslResource } from './caslRules';
import { unpackRules } from '@casl/ability-v6/extra';
import { CaslAbility, buildAbility } from './caslAbility';

type CanParams = Parameters<CaslAbility['can']>;

export default class Ability {
  caslAbility: CaslAbility;

  constructor(packedRules: PackedRules) {
    this.caslAbility = buildAbility(unpackRules(packedRules));
  }

  can(action: CanParams[0] | CanParams[0][], resource: CanParams[1], field?: CanParams[2]) {
    if (typeof action === 'string') return this.caslAbility.can(action, resource, field);

    for (const subAction of action)
      if (!this.caslAbility.can(subAction, resource, field)) return false;

    return true;
  }

  filter(action: CanParams[0] | CanParams[0][], resource: CanParams[1], array: any[]) {
    return array.filter((resourceInstance) =>
      this.can(action, toCaslResource(resource, resourceInstance)),
    );
  }

  checkInputFields(
    resourceObj: any,
    action: CanParams[0] | CanParams[0][],
    input: any,
    prefix: string = '',
  ) {
    if (typeof input !== 'object') return this.can(action, resourceObj, prefix);

    for (const key of Object.keys(input)) {
      if (
        !this.checkInputFields(resourceObj, action, input[key], `${prefix}${prefix && '.'}${key}`)
      )
        return false;
    }

    return true;
  }
}
