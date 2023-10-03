// @ts-ignore
import { PERMISSION_MAPPING } from 'proceed-management-system/src/shared-frontend-backend/constants';
import {
  ResourceActionType,
  resourceAction,
} from '../../../../../../management-system-v2/lib/ability/caslAbility';

type ResourceActionsMappingType = Record<ResourceActionType, number>;
const ResourceActionsMapping = PERMISSION_MAPPING as ResourceActionsMappingType;

export const adminPermissions = 9007199254740991;
export function permissionNumberToIdentifiers(permission: number): ResourceActionType[] {
  if (permission === 0) {
    return ['none'];
  }

  if (permission === adminPermissions) {
    return ['admin'];
  }

  const actions = [];

  // starts at 1 because none would be allways included and
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
