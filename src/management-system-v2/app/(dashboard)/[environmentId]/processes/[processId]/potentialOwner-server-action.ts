'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import { RoleType, UserType } from './use-potentialOwner-store';

export const fetchPotentialOwner = async (environmentId: string) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  const rawRoles = activeEnvironment.isOrganization
    ? await getRolesWithMembers(activeEnvironment.spaceId, ability)
    : [];

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

  return { user, roles };
};
