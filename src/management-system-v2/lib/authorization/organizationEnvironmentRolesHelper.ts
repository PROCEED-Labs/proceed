import { Role } from '../data/role-schema';
import { getRoleById, getRoles } from '../data/db/iam/roles';
import { isMember } from '../data/db/iam/memberships';
import { getRoleMappingByUserId } from '../data/db/iam/role-mappings';
import { ok } from 'neverthrow';

/** Returns all roles that are applied to a user in a given organization environment */
export async function getAppliedRolesForUser(userId: string, environmentId: string) {
  // enforces environment to be an organization
  if (!isMember(environmentId, userId)) throw new Error('User is not a member of this environment');

  const environmentRoles = await getRoles(environmentId);
  if (environmentRoles.isErr()) {
    return environmentRoles;
  }

  const userRoles: Role[] = [];

  const guestRole = environmentRoles.value.find((role: any) => role.name === '@guest') as Role;
  userRoles.push(guestRole);

  if (userId === '') return ok(userRoles);

  const everyoneRole = environmentRoles.value.find(
    (role: any) => role.default && role.name === '@everyone',
  ) as Role;
  userRoles.push(everyoneRole);

  const roleMappings = await getRoleMappingByUserId(userId, environmentId);
  if (roleMappings.isErr()) {
    return roleMappings;
  }

  const roleResults = await Promise.all(
    roleMappings.value.map((mapping) => getRoleById(mapping.roleId)),
  );

  for (const role of roleResults) {
    if (role && role.isErr()) {
      return role;
    }
    if (role.value) userRoles.push(role.value);
  }

  return ok(userRoles);
}
