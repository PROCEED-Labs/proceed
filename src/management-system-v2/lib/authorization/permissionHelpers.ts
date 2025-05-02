import { ResourceActionType, resourceAction } from '@/lib/ability/caslAbility';

// permission mapping to verbs
export const ResourceActionsMapping = {
  none: 0,
  view: 1,
  update: 2,
  create: 4,
  delete: 8,
  manage: 16,
  admin: 9007199254740991,
} as const satisfies Record<ResourceActionType, number>;

export const adminPermissions = ResourceActionsMapping.admin;
export function permissionNumberToIdentifiers(permission: number): ResourceActionType[] {
  if (permission === 0) {
    return ['none'];
  }

  if (permission === adminPermissions) {
    return ['admin'];
  }

  const actions: ResourceActionType[] = [];

  // starts at 1 because none would be always included and
  // ends at length-1 because admin needs to be added with adminPermissions number
  for (let actionIndex = 1; actionIndex < resourceAction.length - 1; actionIndex++) {
    const actionIdentifier = resourceAction[actionIndex];
    const bit = ResourceActionsMapping[actionIdentifier];

    if ((permission & bit) === bit) {
      actions.push(actionIdentifier);
    }
  }

  return actions;
}

export function permissionIdentifiersToNumber(actions: ResourceActionType[]): number {
  let permissionNumber = 0;

  for (const action of actions) {
    const bitFlag = ResourceActionsMapping[action];

    // If this where a sum, we would have to check for duplicates in the array;
    permissionNumber |= bitFlag;
  }

  return permissionNumber;
}
