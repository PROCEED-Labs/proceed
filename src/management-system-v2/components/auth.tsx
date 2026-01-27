import { cache } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAbilityForUser } from '@/lib/authorization/authorization';
import { getUserOrganizationEnvironments, isMember } from '@/lib/data/db/iam/memberships';
import { getSystemAdminByUserId } from '@/lib/data/db/iam/system-admins';
import Ability from '@/lib/ability/abilityHelper';
import {
  packedAdminRules,
  packedGlobalOrganizationRules,
  packedGlobalUserRules,
} from '@/lib/authorization/globalRules';
import { env } from '@/lib/ms-config/env-vars';
import * as noIamUser from '@/lib/no-iam-user';
import { getUserById } from '@/lib/data/db/iam/users';
import { cookies } from 'next/headers';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { packedStaticRules } from '@/lib/authorization/caslRules';
import { err, ok } from 'neverthrow';
import { UserFacingError } from '@/lib/server-error-handling/user-error';

export const getCurrentUser = cache(async () => {
  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) {
    return ok({
      session: noIamUser.session,
      userId: noIamUser.userId,
      systemAdmin: noIamUser.systemAdmin,
      user: noIamUser.user,
    });
  }

  const session = await auth();
  const userId = session?.user.id || '';
  const [systemAdmin, user] = await Promise.all([
    getSystemAdminByUserId(userId),
    userId !== '' ? getUserById(userId) : undefined,
  ]);

  if (systemAdmin.isErr()) return systemAdmin;
  if (user && user.isErr()) return user;

  // Sign out user if the id doesn't correspond to a user in the db
  // We need to reset the cookie that stores the user id, this isn't possible
  // inside a server components, so we need to redirect the user to an endpoint
  // that logs him out, this endpoint needs to csrf protected, for this we use
  // the user's csrf token (which was added by next-auth)
  if (userId !== '' && !user?.value) {
    const cookieStore = cookies();
    const csrfToken = cookieStore.get('proceed.csrf-token')!.value;

    const searchParams = new URLSearchParams({ csrfToken });

    if (session?.user.isGuest) {
      searchParams.append(
        'callbackUrl',
        `/signin?error=${encodeURIComponent('$info You have previously used PROCEED as a Guest. This account and your data have been deleted due to discontinued use. If you want to avoid this, please log in as a user.')}`,
      );
    }

    redirect(`/api/private/signout?${searchParams}`);
  }

  return ok({ session, userId, systemAdmin: systemAdmin.value, user: user?.value });
});

const systemAdminRulesForOrganizations = packedAdminRules
  .concat(packedGlobalOrganizationRules)
  .concat(packedStaticRules);

const systemAdminRulesForPersonalSpaces = packedAdminRules
  .concat(packedGlobalUserRules)
  .concat(packedStaticRules);

export const getSystemAdminRules = cache((isOrganization: boolean) => {
  if (isOrganization) {
    return systemAdminRulesForOrganizations;
  } else {
    return systemAdminRulesForPersonalSpaces;
  }
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
    const currentUser = await getCurrentUser();
    if (currentUser.isErr()) {
      return err('Could not get the current user');
    }

    const { userId, systemAdmin } = currentUser.value;
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
      // if (userOrgs.isErr()) {
      //   return userOrgs;
      // }

      if (userOrgs.value.length === 0) {
        if (env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE) {
          return err(new UserFacingError('You are not part of an organization.'));
        } else {
          return redirect(`/create-organization`);
        }
      }

      activeSpace = userOrgs.value[0];
      isOrganization = true;
    }

    // TODO: account for bought resources

    if (systemAdmin || !msConfig.PROCEED_PUBLIC_IAM_ACTIVE) {
      const rules = getSystemAdminRules(isOrganization);

      return ok({
        ability: new Ability(rules, activeSpace),
        activeEnvironment: { spaceId: activeSpace, isOrganization },
      });
    }

    if (!userId || !isMember(decodeURIComponent(spaceIdParam), userId)) {
      switch (opts?.permissionErrorHandling.action) {
        case 'throw-error':
          return err(new Error('User does not have access to this environment'));
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
    if (ability.isErr()) {
      return ability;
    }

    return ok({
      ability: ability.value,
      activeEnvironment: { spaceId: activeSpace, isOrganization },
    });
  },
);
