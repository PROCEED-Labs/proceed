import { PackRule, packRules, unpackRules } from '@casl/ability/extra';
import {
  AbilityRule,
  CaslAbility,
  ResourceType,
  TreeMap,
  buildAbility,
  toCaslResource,
} from './caslAbility';

type CanParams = Parameters<CaslAbility['can']>;

type NeedsEnvId<T> = T extends string ? false : T extends { environmentId: string } ? false : true;
type OptionalIfHasEnvId<TCheck, TParam> =
  NeedsEnvId<TCheck> extends true ? [TParam & { environmentId: string }] : [TParam?];

export default class Ability {
  caslAbility: CaslAbility;
  environmentId: string;

  constructor(packedRules: PackRule<AbilityRule>[], environmentId: string, tree?: TreeMap) {
    this.environmentId = environmentId;
    this.caslAbility = buildAbility(unpackRules(packedRules), tree);
  }

  can<T extends CanParams[1]>(
    action: CanParams[0] | CanParams[0][],
    resource: T,
    ..._opts: OptionalIfHasEnvId<T, { field?: CanParams[2]; environmentId?: string }>
  ) {
    const opts = _opts[0];

    // environmentId has to be either be specified in the resource, or as an additional parameter
    if (
      typeof resource == 'object' &&
      !('environmentId' in resource) &&
      (!opts || !('environmentId' in opts))
    )
      throw new Error(
        'The environmentId must be specified either in the resource or as an additional parameter.',
      );

    if (typeof action === 'string') return this.caslAbility.can(action, resource, opts?.field);

    for (const subAction of action)
      if (!this.caslAbility.can(subAction, resource, opts?.field)) return false;

    return true;
  }

  filter<T extends {}>(action: CanParams[0] | CanParams[0][], resource: ResourceType, array: T[]) {
    return array.filter((resourceInstance) =>
      this.can(action, toCaslResource(resource, resourceInstance), {
        environmentId: this.environmentId,
      }),
    ) as T[];
  }

  checkInputFields(
    resourceObj: any,
    action: CanParams[0] | CanParams[0][],
    input: any,
    prefix: string = '',
  ) {
    if (typeof input !== 'object' || input === null)
      return this.can(action, resourceObj, { field: prefix });

    for (const key of Object.keys(input)) {
      if (
        !this.checkInputFields(resourceObj, action, input[key], `${prefix}${prefix && '.'}${key}`)
      )
        return false;
    }

    return true;
  }
}

export class UnauthorizedError extends Error {
  constructor(message?: string) {
    super(message ?? 'Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export const adminRules = Object.freeze(
  packRules([
    {
      subject: 'All',
      action: 'admin',
    },
  ] as AbilityRule[]),
);
