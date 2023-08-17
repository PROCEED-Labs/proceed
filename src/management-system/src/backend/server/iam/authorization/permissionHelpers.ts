// @ts-ignore
import { PERMISSION_MAPPING } from 'proceed-management-system/src/shared-frontend-backend/constants';

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
export type ResourceType = typeof resources[number];

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
export type ResourceActionType = typeof resourceAction[number];

export type PermissionNumber = number;

type ResourceActionsMappingType = Record<ResourceActionType, PermissionNumber>;
const ResourceActionsMapping = PERMISSION_MAPPING as ResourceActionsMappingType;

export const adminPermissions = 9007199254740991;
export function permissionNumberToIdentifiers(permission: PermissionNumber): ResourceActionType[] {
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
