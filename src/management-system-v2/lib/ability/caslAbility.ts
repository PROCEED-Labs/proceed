import {
  AbilityBuilder,
  createAliasResolver,
  PureAbility,
  RawRuleOf,
  fieldPatternMatcher,
  subject,
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
  'RoleMapping',
  'Share',
  'Environment',
  'Folder',
  'All',
] as const;
export type ResourceType = (typeof resources)[number];

export const resourceAction = [
  'none',
  'view',
  'update',
  'create',
  'delete',
  // casl aliases
  'manage',
  'admin',
] as const;
export type ResourceActionType = (typeof resourceAction)[number];

export type PermissionNumber = number;

export type TreeMap = {
  [folderId: string]: string;
};

export const FolderScopedResources = ['Process', 'Project', 'Template', 'Folder'] as const;
export type FolderScopedResource = (typeof FolderScopedResources)[number];

const conditions = {
  $in: (valueInCondition: any[]) => (inputValue: any) => valueInCondition.includes(inputValue),
  $eq: (valueInCondition: any) => (inputValue: any) => valueInCondition === inputValue,
  $neq: (valueInCondition: any) => (inputValue: any) => valueInCondition !== inputValue,
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
      [C in ConditionOperator]?: Parameters<(typeof conditions)[C]>[0] | null;
    };
  };
  /* Folder id: only matches if the resource instance is a child of this folder */
  hasToBeChildOf?: string;
  wildcardOperator?: 'or' | 'and';
  conditionsOperator?: 'or' | 'and';
  pathNotFound?: boolean;
};

function combineFunctions(functions: ((resource: any) => boolean)[], operator: 'or' | 'and') {
  if (functions.length === 0) return () => true;

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

function conditionsMatcherFactory(tree?: TreeMap) {
  return function conditionsMatcher(conditionsObject: ConditionsObject) {
    const conditionsForResource: ((resource: any) => boolean)[] = [];

    for (const [path, condition] of Object.entries(conditionsObject.conditions)) {
      for (const [conditionOperator, valueInCondition] of Object.entries(condition)) {
        if (conditionOperator.startsWith('$property_'))
          conditionsForResource.push((resource) =>
            testConidition(
              path.split('.'),
              resource,
              conditions[conditionOperator as ConditionOperator](
                valueInCondition as never,
                resource,
              ),
              conditionsObject.wildcardOperator || 'and',
              conditionsObject.pathNotFound || false,
            ),
          );
        else
          conditionsForResource.push((resource) =>
            testConidition(
              path.split('.'),
              resource,
              conditions[conditionOperator as ConditionOperator](
                valueInCondition as never,
                resource,
              ),
              conditionsObject.wildcardOperator || 'and',
              conditionsObject.pathNotFound || false,
            ),
          );
      }
    }

    const combinedFunctions = combineFunctions(
      conditionsForResource,
      conditionsObject.conditionsOperator || 'and',
    );

    if (conditionsObject.hasToBeChildOf) {
      if (!tree)
        throw new Error(
          'If you specify a subtree (key: hasToBeChildOf) for a condition, you have to build the ability with a tree',
        );

      return (resource: any) => {
        // Folder permissions are also applied to the folder itself
        if (
          (resource.__caslSubjectType__ as ResourceType) === 'Folder' &&
          resource.id === conditionsObject.hasToBeChildOf
        )
          return true;

        // If the resource doesn't specify a perent we can't know where it should be in the tree.
        // Although this would probably be an error, this should be caught by zod, so here
        // we just return false implying that this rule doesn't apply.
        if (!resource.parentId) return false;

        let isChild = false;
        let currentFolder = resource.parentId;

        while (currentFolder) {
          if (currentFolder === conditionsObject.hasToBeChildOf) {
            isChild = true;
            break;
          }
          currentFolder = tree[currentFolder];
        }

        if (!isChild) return false;

        return combinedFunctions(resource);
      };
    }

    return combinedFunctions;
  };
}

export type CaslAbility = PureAbility<
  [ResourceActionType, ResourceType | Record<PropertyKey, any>],
  ConditionsObject
>;
export type AbilityRule = RawRuleOf<CaslAbility>;

// beware: casl usually uses 'manage' as a wildcard
const resolveAction = createAliasResolver(
  {
    manage: ['view', 'update', 'create', 'delete'],
  },
  {
    anyAction: 'admin',
  },
);

export function buildAbility(rules: AbilityRule[], tree?: TreeMap) {
  const builder = new AbilityBuilder<CaslAbility>(PureAbility);

  const ability = builder.build({
    resolveAction,
    anyAction: 'admin',
    anySubjectType: 'All',
    conditionsMatcher: conditionsMatcherFactory(tree),
    fieldMatcher: fieldPatternMatcher,
  });

  ability.update(rules);

  return ability;
}

export function toCaslResource<T extends Record<PropertyKey, any>>(
  resource: ResourceType,
  object: T,
) {
  return subject(resource, { ...object });
}
