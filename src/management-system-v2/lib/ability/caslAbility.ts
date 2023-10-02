import {
  AbilityBuilder,
  createAliasResolver,
  PureAbility,
  RawRuleOf,
  fieldPatternMatcher,
} from '@casl/ability';

export const resources = [
  'Process',
  'Project',
  'Template',
  'Task',
  'Machine',
  'Execution',
  'Role',
  'User',
  'Setting',
  'EnvConfig',
  'RoleMapping', // added in, in order to do it "the casl way"
  'Share', // added in, in order to do it "the casl way"
  'All',
] as const;
export type ResourceType = (typeof resources)[number];

export const resourceAction = [
  'none',
  'view',
  'update',
  'create',
  'delete',
  'manage',
  'share',
  'manage-roles',
  'manage-groups',
  'manage-password',
  'admin',
] as const;
export type ResourceActionType = (typeof resourceAction)[number];

export type PermissionNumber = number;

const conditions = {
  $in: (valueInCondition: any[]) => (inputValue: any) => valueInCondition.includes(inputValue),
  $eq: (valueInCondition: any) => (inputValue: any) => valueInCondition === inputValue,
  $eq_string_case_insensitive: (valueInCondition: string) => (inputValue: string) =>
    valueInCondition.toLowerCase() === inputValue.toLowerCase(),
  $gte: (valueInCondition: number) => (inputValue: number) => inputValue >= valueInCondition,
  $expired_property: (_: null) => (date: string) => date === null || new Date(date) < new Date(),
  $not_expired_property: (_: null) => (date: Date) => date === null || new Date(date) > new Date(),
  $expired_value: (date: string) => (_: null) => date === null || new Date(date) < new Date(),
  $not_expired_value: (date: string) => (_: null) => date === null || new Date(date) > new Date(),
  $property_eq: (nextProperty: string, resource: any) => (inputValue: any) =>
    testConidition(
      nextProperty.split('.'),
      resource,
      (secondValue) => secondValue === inputValue,
      'and',
      false,
    ),
} as const;

type ConditionOperator = keyof typeof conditions;
type ConditionsObject = {
  conditions: {
    [path: string]: {
      [C in ConditionOperator]?: Parameters<(typeof conditions)[C]>[0];
    };
  };
  wildcardOperator?: 'or' | 'and';
  conditionsOperator?: 'or' | 'and';
  pathNotFound?: boolean;
};

function combineFunctions(functions: ((resource: any) => boolean)[], operator: 'or' | 'and') {
  return (resource: any) => {
    for (const fn of functions) {
      if (operator === 'or' && fn(resource)) return true;
      else if (operator === 'and' && !fn(resource)) return false;
    }
    return operator === 'and';
  };
}

function testConidition(
  path: string[],
  resource: any,
  condition: (value: any) => boolean,
  strategy: 'or' | 'and',
  pathNotFound: boolean,
): boolean {
  let value = resource;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];

    if (key === '*') {
      return combineFunctions(
        Object.keys(value).map((childKey) => {
          return (value) =>
            testConidition(
              [childKey, ...path.slice(i + 1)],
              value,
              condition,
              strategy,
              pathNotFound,
            );
        }),
        strategy,
      )(value);
    } else if (key === '$') {
      return condition(value);
    }

    if (!(key in value)) return pathNotFound;

    value = value[key];
  }

  return condition(value);
}

function conditionsMatcher(conditionsObject: ConditionsObject) {
  const conditionsForResource: ((resource: any) => boolean)[] = [];

  for (const [path, condition] of Object.entries(conditionsObject.conditions)) {
    for (const [conditionOperator, valueInCondition] of Object.entries(condition)) {
      if (conditionOperator.startsWith('$property_'))
        conditionsForResource.push((resource) =>
          testConidition(
            path.split('.'),
            resource,
            conditions[conditionOperator as ConditionOperator](valueInCondition as never, resource),
            conditionsObject.wildcardOperator || 'and',
            conditionsObject.pathNotFound || false,
          ),
        );
      else
        conditionsForResource.push((resource) =>
          testConidition(
            path.split('.'),
            resource,
            conditions[conditionOperator as ConditionOperator](valueInCondition as never, resource),
            conditionsObject.wildcardOperator || 'and',
            conditionsObject.pathNotFound || false,
          ),
        );
    }
  }

  return combineFunctions(conditionsForResource, conditionsObject.conditionsOperator || 'and');
}

export type CaslAbility = PureAbility<[ResourceActionType, ResourceType], ConditionsObject>;
export type AbilityRule = RawRuleOf<CaslAbility>;

// beware: casl usually uses 'manage' as a wildcard
const resolveAction = createAliasResolver(
  {
    manage: ['update', 'create', 'delete'],
    'manage-roles': ['view', 'update', 'create', 'delete'],
  },
  {
    anyAction: 'admin',
  },
);

export function buildAbility(rules: AbilityRule[]) {
  const builder = new AbilityBuilder<CaslAbility>(PureAbility);

  const ability = builder.build({
    resolveAction,
    anyAction: 'admin',
    anySubjectType: 'All',
    conditionsMatcher,
    fieldMatcher: fieldPatternMatcher,
  });

  ability.update(rules);

  return ability;
}
