'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import { RoleType, UserType } from './use-potentialOwner-store';

export const fetchPotentialOwner = async (environmentId: string) => {
  if (environmentId) {
    const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

    if (activeEnvironment.isOrganization) {
      const rawRoles = await getRolesWithMembers(activeEnvironment.spaceId, ability);

      const roles = rawRoles.reduce(
        (acc, role) => ({ ...acc, [role.id]: role.name }),
        {} as RoleType,
      );
      const user = rawRoles.reduce((acc, role) => {
        role.members.forEach((member) => {
          acc[member.id] = {
            userName: member.username,
            name: member.firstName + ' ' + member.lastName,
          };
        });

        return acc;
      }, {} as UserType);

      return { roles, user };
    } else {
      // make sure to get the current user that might not be assigned to any role
      const u = await getCurrentUser();
      if (u.session?.user) {
        const currUser = u.session.user;
        if (!currUser.isGuest) {
          return {
            roles: {},
            user: [
              {
                userName: currUser.username,
                name: currUser.firstName + ' ' + currUser.lastName,
              },
            ],
          };
        }
      }
    }
  }

  return { user: {}, roles: {} };
};
