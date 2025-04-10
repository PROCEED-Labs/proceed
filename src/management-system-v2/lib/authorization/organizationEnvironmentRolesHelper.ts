import { Role } from '../data/role-schema';
import { getRoleById, getRoles } from '../data/db/iam/roles';
import { isMember } from '../data/db/iam/memberships';
import { getRoleMappingByUserId } from '../data/db/iam/role-mappings';

/** Returns all roles that are applied to a user in a given organization environment */
export async function getAppliedRolesForUser(
  userId: string,
  environmentId: string,
): Promise<Role[]> {
  // enforces environment to be an organization
  if (!isMember(environmentId, userId)) throw new Error('User is not a member of this environment');

  const environmentRoles = await getRoles(environmentId);

  const userRoles: Role[] = [];

  const guestRole = environmentRoles.find((role: any) => role.name === '@guest') as Role;
  userRoles.push(guestRole);

  if (userId === '') return userRoles;

  const everyoneRole = environmentRoles.find(
    (role: any) => role.default && role.name === '@everyone',
  ) as Role;
  userRoles.push(everyoneRole);
  const roleMappings = await getRoleMappingByUserId(userId, environmentId);
  const mappedRoles = await Promise.all(roleMappings.map((mapping) => getRoleById(mapping.roleId)));
  userRoles.push(...mappedRoles);

  return userRoles.filter((e) => e !== undefined);
}
