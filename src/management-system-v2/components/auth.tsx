import { cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { getAbilityForUser } from '@/lib/authorization/authorization';
import nextAuthOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { isMember } from '@/lib/data/db/iam/memberships';
import { getSystemAdminByUserId } from '@/lib/data/db/iam/system-admins';
import Ability from '@/lib/ability/abilityHelper';
import {
  adminRules,
  packedGlobalOrganizationRules,
  packedGlobalUserRules,
} from '@/lib/authorization/globalRules';
import { env } from '@/lib/env-vars';
import * as noIamUser from '@/lib/no-iam-user';

export const getCurrentUser = cache(async () => {
  if (!env.PROCEED_PUBLIC_IAM_ACTIVATE) {
    return {
      session: noIamUser.session,
      userId: noIamUser.userId,
      systemAdmin: noIamUser.systemAdmin,
    };
  }

  const session = await getServerSession(nextAuthOptions);
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

    if (
      spaceIdParam === 'my' || // Use hardcoded environment /my/processes for personal spaces.
      !env.PROCEED_PUBLIC_IAM_ACTIVATE // when iam isn't active we hardcode the space to be the no-iam user's personal space
    ) {
      // Note: will be undefined for not logged in users
      spaceIdParam = userId;
    }

    const activeSpace = decodeURIComponent(spaceIdParam);
    const isOrganization = activeSpace !== userId;

    // TODO: account for bought resources

    if (systemAdmin || !env.PROCEED_PUBLIC_IAM_ACTIVATE) {
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
