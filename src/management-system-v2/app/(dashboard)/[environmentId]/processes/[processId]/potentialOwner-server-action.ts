'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import { RoleType, UserType } from './use-potentialOwner-store';
import { getUsers } from '@/lib/data/db/iam/users';

export const fetchPotentialOwner = async (environmentId: string) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  const rawRoles = await getRolesWithMembers(activeEnvironment.spaceId, ability);

  const roles = rawRoles.reduce((acc, role) => ({ ...acc, [role.id]: role.name }), {} as RoleType);
  const user = rawRoles.reduce((acc, role) => {
    role.members.forEach((member) => {
      acc[member.id] = {
        userName: member.username,
        name: member.firstName + ' ' + member.lastName,
      };
    });

    return acc;
  }, {} as UserType);

  const { users: dbUsers } = await getUsers();
  for (const u of dbUsers) {
    if (!u.isGuest && !user[u.id]) {
      user[u.id] = {
        userName: u.username,
        name: u.firstName + ' ' + u.lastName,
      };
    }
  }

  return { user, roles };
};
