'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import { RoleType, UserType } from './use-potentialOwner-store';

export const fetchPotentialOwner = async (environmentId: string) => {
  const user: UserType = {};
  const roles: RoleType = {};
  if (environmentId) {
    const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

    if (activeEnvironment.isOrganization) {
      const rawRoles = await getRolesWithMembers(activeEnvironment.spaceId, ability);

      rawRoles.forEach((role) => {
        roles[role.id] = role.name;

        role.members.forEach((member) => {
          user[member.id] = {
            userName: member.username,
            name: member.firstName + ' ' + member.lastName,
          };
        });
      });
    } else {
      // make sure to get the current user that might not be assigned to any role
      const u = await getCurrentUser();
      if (u.session?.user) {
        const currUser = u.session.user;
        if (!currUser.isGuest) {
          user[currUser.id] = {
            userName: currUser.username,
            name: currUser.firstName + ' ' + currUser.lastName,
          };
        }
      }
    }
  }

  return { user, roles };
};
