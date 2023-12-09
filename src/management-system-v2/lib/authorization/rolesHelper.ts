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
    return [Object.values(roleMetaObjects).find((role) => role.default && role.name === '@guest')];

  const userRoles: Role[] = [];

  const adminRole = Object.values(roleMetaObjects).find(
    (role) => role.default && role.name === '@admin',
  );
  if (adminRole.members.map((member) => member.userId).includes(userId)) userRoles.push(adminRole);

  userRoles.push(
    Object.values(roleMetaObjects).find((role) => role.default && role.name === '@everyone'),
  );

  if (roleMappingsMetaObjects.users.hasOwnProperty(userId)) {
    roleMappingsMetaObjects.users[userId].forEach((role) => {
      const roleObject = roleMetaObjects[role.roleId];
      if (roleObject.expiration === null || new Date(roleObject.expiration) > new Date())
        userRoles.push(roleMetaObjects[role.roleId]);
    });
  }

  return userRoles;
}
