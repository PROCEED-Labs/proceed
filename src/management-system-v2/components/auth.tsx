import { cache } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAbilityForUser } from '@/lib/authorization/authorization';
import { getUserOrganizationEnvironments, isMember } from '@/lib/data/db/iam/memberships';
import { getSystemAdminByUserId } from '@/lib/data/db/iam/system-admins';
import Ability from '@/lib/ability/abilityHelper';
import {
  adminRules,
  packedGlobalOrganizationRules,
  packedGlobalUserRules,
} from '@/lib/authorization/globalRules';
import { env } from '@/lib/ms-config/env-vars';
import * as noIamUser from '@/lib/no-iam-user';
import { getUserById } from '@/lib/data/db/iam/users';
import { cookies } from 'next/headers';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { UIError as UserUIError } from '@/lib/ui-error';

export const getCurrentUser = cache(async () => {
  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) {
    return {
      session: noIamUser.session,
      userId: noIamUser.userId,
      systemAdmin: noIamUser.systemAdmin,
      user: noIamUser.user,
    };
  }

  const session = await auth();
  const userId = session?.user.id || '';
  const [systemAdmin, user] = await Promise.all([
    getSystemAdminByUserId(userId),
    userId !== '' ? getUserById(userId) : undefined,
  ]);

  // Sign out user if the id doesn't correspond to a user in the db
  // We need to reset the cookie that stores the user id, this isn't possible
  // inside a server components, so we need to redirect the user to an endpoint
  // that logs him out, this endpoint needs to csrf protected, for this we use
  // the user's csrf token (which was added by next-auth)
  if (userId !== '' && !user) {
    const cookieStore = cookies();
    const csrfToken = cookieStore.get('proceed.csrf-token')!.value;

    const searchParams = new URLSearchParams({ csrfToken });

    if (session?.user.isGuest) {
      searchParams.append(
        'callbackUrl',
        `/signin?error=${encodeURIComponent('$info Your guest account was deleted due to inactivity')}`,
      );
    }

    redirect(`/api/private/signout?${searchParams}`);
  }

  return { session, userId, systemAdmin, user };
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
    const msConfig = await getMSConfig();

    if (
      // userId && // first of all, only do this for users that are signed in
      spaceIdParam === 'my' || // Use hardcoded environment /my/processes for personal spaces.
      !msConfig.PROCEED_PUBLIC_IAM_ACTIVE // when iam isn't active we hardcode the space to be the no-iam user's personal space
    ) {
      spaceIdParam = userId;
    }

    let activeSpace = decodeURIComponent(spaceIdParam);
    let isOrganization = activeSpace !== userId;

    // When trying to access a personal space
    if (userId && !isOrganization && !env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE) {
      // Note: will be undefined for not logged in users
      const userOrgs = await getUserOrganizationEnvironments(userId);

      if (userOrgs.length === 0) {
        if (env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE) {
          throw new UserUIError('You are not part of an organization.');
        } else {
          return redirect(`/create-organization`);
        }
      }

      activeSpace = userOrgs[0];
      isOrganization = true;
    }

    // TODO: account for bought resources

    if (systemAdmin || !msConfig.PROCEED_PUBLIC_IAM_ACTIVE) {
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
