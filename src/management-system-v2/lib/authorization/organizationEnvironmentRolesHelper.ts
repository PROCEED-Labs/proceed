import { getRoleById, getRoles } from '@/lib/data/legacy/iam/roles';
import { getRoleMappingByUserId } from '@/lib/data/legacy/iam/role-mappings';
import { Role } from '../data/role-schema';
import { isMember } from '../data/legacy/iam/memberships';

/** Returns all roles that are applied to a user in a given organization environment */
export function getAppliedRolesForUser(userId: string, environmentId: string): Role[] {
  // enforces environment to be an organization
  if (!isMember(environmentId, userId)) throw new Error('User is not a member of this environment');

  const environmentRoles = getRoles(environmentId);

  const userRoles: Role[] = [];

  const guestRole = environmentRoles.find((role: any) => role.name === '@guest') as Role;
  userRoles.push(guestRole);

  if (userId === '') return userRoles;

  const everyoneRole = environmentRoles.find(
    (role: any) => role.default && role.name === '@everyone',
  ) as Role;
  userRoles.push(everyoneRole);

  userRoles.push(
    ...getRoleMappingByUserId(userId, environmentId).map((roleMapping) =>
      getRoleById(roleMapping.roleId),
    ),
  );

  return userRoles;
}
