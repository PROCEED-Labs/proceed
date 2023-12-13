import { roleMetaObjects } from '@/lib/data/legacy/iam/roles';
import { roleMappingsMetaObjects } from '@/lib/data/legacy/iam/role-mappings';
import { PermissionNumber, ResourceType } from '@/lib/ability/caslAbility';

type Role = {
  name: string;
  permissions: Partial<Record<ResourceType, PermissionNumber>>;
  id: string;
  default: boolean;
  expiration: string | null | undefined;
};

export function getAppliedRolesForUser(userId: string): Role[] {
  if (userId === '')
    return [
      Object.values(roleMetaObjects).find((role: any) => role.default && role.name === '@guest'),
    ] as Role[];

  const userRoles: Role[] = [];

  userRoles.push(
    Object.values(roleMetaObjects).find(
      (role: any) => role.default && role.name === '@everyone',
    ) as Role,
  );

  if (roleMappingsMetaObjects.users.hasOwnProperty(userId)) {
    roleMappingsMetaObjects.users[userId].forEach((role: any) => {
      const roleObject = roleMetaObjects[role.roleId];
      if (roleObject.expiration === null || new Date(roleObject.expiration) > new Date())
        userRoles.push(roleMetaObjects[role.roleId]);
    });
  }

  return userRoles;
}
