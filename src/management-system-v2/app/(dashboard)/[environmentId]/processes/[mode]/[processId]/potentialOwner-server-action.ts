'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import { RoleType, UserType } from './use-potentialOwner-store';
import { getErrorMessage, userError } from '@/lib/server-error-handling/user-error';

export const fetchPotentialOwner = async (environmentId: string) => {
  const user: UserType = {};
  const roles: RoleType = {};
  if (environmentId) {
    const currentSpace = await getCurrentEnvironment(environmentId);
    if (currentSpace.isErr()) {
      return userError(getErrorMessage(currentSpace.error));
    }

    const { ability, activeEnvironment } = currentSpace.value;

    if (activeEnvironment.isOrganization) {
      const rawRoles = await getRolesWithMembers(activeEnvironment.spaceId, ability);
      if (rawRoles.isErr()) {
        return userError(getErrorMessage(rawRoles.error));
      }

      rawRoles.value.forEach((role) => {
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
      if (u.isErr()) {
        return userError(getErrorMessage(u.error));
      }

      if (u.value.session?.user) {
        const currUser = u.value.session.user;
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
