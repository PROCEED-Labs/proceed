import { enableUseDB } from 'FeatureFlags';
import { Role } from '../data/role-schema';

let getRoleById:
  | typeof import('@/lib/data/db/iam/roles').getRoleById
  | typeof import('@/lib/data/legacy/iam/roles').getRoleById;
let getRoles:
  | typeof import('@/lib/data/db/iam/roles').getRoles
  | typeof import('@/lib/data/legacy/iam/roles').getRoles;
let getRoleMappingByUserId:
  | typeof import('@/lib/data/db/iam/role-mappings').getRoleMappingByUserId
  | typeof import('@/lib/data/legacy/iam/role-mappings').getRoleMappingByUserId;
let isMember:
  | typeof import('@/lib/data/db/iam/memberships').isMember
  | typeof import('@/lib/data/legacy/iam/memberships').isMember;

const loadModules = async () => {
  const [roleModule, roleMappingModule, membershipModule] = await Promise.all([
    enableUseDB ? import('@/lib/data/db/iam/roles') : import('@/lib/data/legacy/iam/roles'),
    enableUseDB
      ? import('@/lib/data/db/iam/role-mappings')
      : import('@/lib/data/legacy/iam/role-mappings'),
    enableUseDB
      ? import('@/lib/data/db/iam/memberships')
      : import('@/lib/data/legacy/iam/memberships'),
  ]);

  getRoleById = roleModule.getRoleById;
  getRoles = roleModule.getRoles;
  getRoleMappingByUserId = roleMappingModule.getRoleMappingByUserId;
  isMember = membershipModule.isMember;
};

loadModules().catch(console.error);

/** Returns all roles that are applied to a user in a given organization environment */
export async function getAppliedRolesForUser(
  userId: string,
  environmentId: string,
): Promise<Role[]> {
  await loadModules();
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
