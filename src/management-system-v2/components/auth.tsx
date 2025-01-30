import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getAbilityForUser } from '@/lib/authorization/authorization';
import { isMember } from '@/lib/data/legacy/iam/memberships';
import { getSystemAdminByUserId } from '@/lib/data/DTOs';
import Ability from '@/lib/ability/abilityHelper';
import {
  adminRules,
  packedGlobalOrganizationRules,
  packedGlobalUserRules,
} from '@/lib/authorization/globalRules';
import { auth } from '@/lib/auth';

export const getCurrentUser = cache(async () => {
  const session = await auth();
  const userId = session?.user.id || '';
  const systemAdmin = await getSystemAdminByUserId(userId);

  return { session, userId, systemAdmin };
});

// TODO: To enable PPR move the session redirect into this function, so it will
// be called when the session is first accessed and everything above can PPR. For
// permissions, each server component should check its permissions anyway, for
// composability.
type PermissionErrorHandling =
  | { action: 'redirect'; redirectUrl?: string }
  | { action: 'throw-error' };
export const getCurrentEnvironment = cache(
  async (
    spaceIdParam: string,
    opts: { permissionErrorHandling: PermissionErrorHandling } = {
      permissionErrorHandling: { action: 'redirect' },
    },
  ) => {
    const { userId, systemAdmin } = await getCurrentUser();

    // Use hardcoded environment /my/processes for personal spaces.
    if (spaceIdParam === 'my') {
      // Note: will be undefined for not logged in users
      spaceIdParam = userId;
    }
    const activeSpace = decodeURIComponent(spaceIdParam);

    const isOrganization = activeSpace !== userId;

    // TODO: account for bought resources
    if (systemAdmin) {
      let rules;
      if (isOrganization) rules = adminRules.concat(packedGlobalOrganizationRules);
      else rules = adminRules.concat(packedGlobalUserRules);

      return {
        ability: new Ability(rules, activeSpace),
        activeEnvironment: { spaceId: activeSpace, isOrganization },
      };
    }

    if (!userId || !isMember(decodeURIComponent(spaceIdParam), userId)) {
      switch (opts?.permissionErrorHandling.action) {
        case 'throw-error':
          throw new Error('User does not have access to this environment');
        case 'redirect':
        default:
          if (opts.permissionErrorHandling.redirectUrl)
            return redirect(opts.permissionErrorHandling.redirectUrl);
          else if (userId) return redirect(`/processes`);
          //NOTE this needs to be removed for guest users
          else return redirect(`/api/auth/signin`);
      }
    }

    const ability = await getAbilityForUser(userId, activeSpace);

    return {
      ability,
      activeEnvironment: { spaceId: activeSpace, isOrganization },
    };
  },
);
