import { cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { getAbilityForUser } from '@/lib/authorization/authorization';
import nextAuthOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { isMember } from '@/lib/data/legacy/iam/memberships';
import { getSystemAdminByUserId } from '@/lib/data/legacy/iam/system-admins';
import Ability, { adminRules } from '@/lib/ability/abilityHelper';

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(nextAuthOptions);
  const userId = session?.user.id || '';
  const systemAdmin = getSystemAdminByUserId(userId);

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
    if (systemAdmin) {
      return {
        ability: new Ability(adminRules, activeSpace),
        activeEnvironment: { spaceId: activeSpace, isOrganization: false },
      };
    }

    if (!userId || !isMember(decodeURIComponent(activeSpace), userId)) {
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
      activeEnvironment: { spaceId: activeSpace, isOrganization: activeSpace !== userId },
    };
  },
);
