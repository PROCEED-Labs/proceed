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
  'MachineConfig',
  // NOTE: All is just supposed to be used for storing permissions in roles
  // what All contains can change with env.NEXT_PUBLIC_MS_ENABLED_RESOURCES
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
  $property_has_to_be_child_of: (valueInCondition: string, _, tree) => {
    if (!tree) {
      throw new Error(
        'If you specify a subtree (key: hasToBeChildOf) for a condition, you have to build the ability with a tree',
      );
    }

    return (resource: any) => {
      if (!valueInCondition) return false;

      // Folder permissions are also applied to the folder itself
      if (
        (resource.__caslSubjectType__ as ResourceType) === 'Folder' &&
        resource.id === valueInCondition
      )
        return true;

      // If the resource doesn't specify a perent we can't know where it should be in the tree.
      // Although this would probably be an error, this should be caught by zod, so here
      // we just return false implying that this rule doesn't apply.
      if (!resource.parentId) return false;

      let currentFolder = resource.parentId;
      const seen = new Set<string>();
      while (currentFolder) {
        if (currentFolder === valueInCondition) return true;

        if (seen.has(currentFolder)) throw new Error('Circular reference in folder tree');
        seen.add(currentFolder);

        currentFolder = tree[currentFolder];
      }

      return false;
    };
  },
  $property_has_to_be_parent_of: (valueInCondition: string, _, tree) => {
    if (!tree) {
      throw new Error(
        'If you specify a subtree (key: hasToBeChildOf) for a condition, you have to build the ability with a tree',
      );
    }

    return (resource: any) => {
      if (!valueInCondition) return false;

      // NOTE: maybe not throw an error but return false
      if ((resource.__caslSubjectType__ as ResourceType) !== 'Folder')
        throw new Error('This condition can only be used with folders');

      if (!resource.id) throw new Error('Folder does not have an id');

      let currentFolder = valueInCondition;
      const seen = new Set<string>();
      while (currentFolder) {
        if (currentFolder === resource.id) return true;

        if (seen.has(currentFolder)) throw new Error('Circular reference in folder tree');
        seen.add(currentFolder);

        currentFolder = tree[currentFolder];
      }

      return false;
    };
  },
} satisfies Record<
  string,
  (
    valueInConditionsObject: any,
    resource: any,
    tree?: TreeMap,
  ) => (inputValueFromResource: any) => boolean
>;

type ConditionOperator = keyof typeof conditions;
type ConditionsObject = {
  conditions: {
    [path: string]: {
      [C in ConditionOperator]?: Parameters<(typeof conditions)[C]>[0] | null;
    };
  };
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
        conditionsForResource.push((resource) =>
          testConidition(
            conditionOperator.startsWith('$property_') ? ['$'] : path.split('.'),
            resource,
            conditions[conditionOperator as ConditionOperator](
              valueInCondition as never,
              resource,
              tree,
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
