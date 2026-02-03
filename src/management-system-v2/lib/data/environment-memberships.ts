'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { UserErrorType, getErrorMessage, userError } from '../server-error-handling/user-error';
import { z } from 'zod';
import { sendEmail } from '../email/mailer';
import renderOrganizationInviteEmail from '../organization-invite-email';
import { OrganizationEnvironment } from './environment-schema';
import { Invitation, acceptInvitation, generateInvitationToken } from '../invitation-tokens';
import { toCaslResource } from '../ability/caslAbility';
import { getRoleById } from '@/lib/data/db/iam/roles';
import { addRoleMappings, type RoleMapping } from '@/lib/data/db/iam/role-mappings';
import {
  addUser,
  getUserByEmail,
  getUserByUsername,
  setUserPassword,
} from '@/lib/data/db/iam/users';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { addMember, isMember, removeMember } from '@/lib/data/db/iam/memberships';
import { env } from '../ms-config/env-vars';
import { AuthenticatedUser, AuthenticatedUserSchema, User } from './user-schema';
import { hashPassword } from '../password-hashes';
import db from '@/lib/data/db';
import { err, ok } from 'neverthrow';

const EmailListSchema = z.array(
  z.union([z.object({ email: z.string().email() }), z.object({ username: z.string() })]),
);

/** 30 days in ms */
const invitationExpirationTime = 30 * 24 * 60 * 60 * 1000;

export async function inviteUsersToEnvironment(
  environmentId: string,
  invitedUsersIdentifiers: ({ email: string } | { username: string })[],
  roleIds?: string[],
) {
  try {
    const invitedEmails = EmailListSchema.parse(invitedUsersIdentifiers);

    const currentEnvironment = await getCurrentEnvironment(environmentId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    const _organization = await getEnvironmentById(environmentId);
    if (_organization.isErr()) return userError(getErrorMessage(_organization.error));
    const organization = _organization.value as OrganizationEnvironment;

    // ability check disallows from adding to personal environments
    if (!ability.can('create', 'User'))
      return userError(
        'You do not have permission to invite users to this environment',
        UserErrorType.PermissionError,
      );

    let filteredRoles;
    if (roleIds) {
      const allowedRolesResults = await Promise.all(
        roleIds!.map(async (roleId) => {
          const role = await getRoleById(roleId);
          if (role.isErr()) return role;
          if (!role.value) return err();

          if (
            ability.can('admin', 'All') &&
            ability.can('manage', toCaslResource('Role', role.value)) &&
            ability.can(
              'create',
              toCaslResource('RoleMapping', {
                userId: '',
                roleId,
              } satisfies Partial<RoleMapping>),
              { environmentId },
            )
          ) {
            return ok(role.value.id);
          } else {
            return err();
          }
        }),
      );

      filteredRoles = (allowedRolesResults.filter((result) => result.isOk()) as any[]).map(
        (result) => result.value,
      ) as string[];
    }

    for (const invitedUserIdentifier of invitedEmails) {
      let invitedUser: User | null = null;
      let invitedUserEmail: string | null | undefined = null;

      if ('email' in invitedUserIdentifier) {
        const userResult = await getUserByEmail(invitedUserIdentifier.email);
        if (userResult.isErr()) continue;
        invitedUser = userResult.value;
      } else if ('username' in invitedUserIdentifier) {
        const userResult = await getUserByUsername(invitedUserIdentifier.username);

        // If there is no user there is nothing we can do
        if (userResult.isErr() || !userResult.value) continue;

        invitedUser = userResult.value;
      }

      // NOTE: technically not possible as guests cannot have an email or username
      if (invitedUser?.isGuest) continue;

      if (invitedUser) {
        const userIsMember = await isMember(environmentId, invitedUser.id);
        if (userIsMember.isErr() || userIsMember.value) continue;

        invitedUserEmail = invitedUser.email;
      } else if ('email' in invitedUserIdentifier) {
        invitedUserEmail = invitedUserIdentifier.email;
      }

      const expirationDate = new Date(Date.now() + invitationExpirationTime);
      const invite: Invitation = {
        spaceId: environmentId,
        roleIds: filteredRoles,
        ...(invitedUser ? { userId: invitedUser.id } : { email: invitedUserEmail! }),
      };

      // TODO: we need to implement a way for users that don't have an email to accept invitations,
      // instead of just adding them to the org
      if (!invitedUserEmail) {
        acceptInvitation(invite);
        continue;
      }

      const invitationToken = generateInvitationToken(invite, expirationDate);
      const invitationEmail = renderOrganizationInviteEmail({
        acceptInviteLink: `${env.NEXTAUTH_URL}/accept-invitation?token=${invitationToken}`,
        expires: expirationDate,
        organizationName: organization.name,
      });

      sendEmail({
        to: invitedUserEmail,
        html: invitationEmail.html,
        text: invitationEmail.text,
        subject: `PROCEED: you've been invited to ${organization.name}`,
      });
    }
  } catch (_) {
    return userError('Error inviting users to environment');
  }
}

export async function removeUsersFromEnvironment(environmentId: string, userIdsInput: string[]) {
  try {
    const userIds = z.array(z.string()).parse(userIdsInput);

    const currentEnvironment = await getCurrentEnvironment(environmentId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    // TODO refine ability check

    // TODO disallow removing self ?

    // ability check disallows from removing to personal environments
    if (!ability.can('delete', 'User'))
      return userError(
        'You do not have permission to remove users from this environment',
        UserErrorType.PermissionError,
      );

    for (const userId of userIds) {
      const res = await removeMember(environmentId, userId, ability);
      if (res.isErr()) return userError('Error removing users from environment');
    }
  } catch (_) {
    return userError('Error removing users from environment');
  }
}

const createUserDataSchema = AuthenticatedUserSchema.pick({
  firstName: true,
  lastName: true,
  username: true,
});
export async function createUserAndAddToOrganization(
  organizationId: string,
  {
    password,
    roles,
    ...userDataInput
  }: z.infer<typeof createUserDataSchema> & { password: string; roles: string[] },
) {
  try {
    const currentEnvironment = await getCurrentEnvironment(organizationId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    // Check if the user is an admin
    if (!ability.can('admin', 'All')) {
      return userError(
        'You do not have permission to create users in this organization',
        UserErrorType.PermissionError,
      );
    }

    const userDataParsed = createUserDataSchema.parse(userDataInput);

    let user: AuthenticatedUser;
    try {
      await db.$transaction(async (tx) => {
        // no need to check the if the user has permissions to create the role mappings since it's
        // he's an admin
        const userResult = await addUser(
          { ...userDataParsed, isGuest: false, emailVerifiedOn: null },
          tx,
        );
        if (userResult.isErr()) throw userResult.error;

        user = userResult.value as AuthenticatedUser;

        const passwordHash = await hashPassword(password);
        const passwordResult = await setUserPassword(user.id, passwordHash, tx, true);
        if (passwordResult.isErr()) throw passwordResult.error;

        const memberResult = await addMember(organizationId, user.id, ability, tx);
        if (memberResult.isErr()) throw memberResult.error;

        const roleMappingsResult = await addRoleMappings(
          roles.map((roleId) => ({
            roleId,
            environmentId: organizationId,
            userId: user.id,
          })),
          ability,
          tx,
        );
        if (roleMappingsResult.isErr()) throw roleMappingsResult.error;
      });
    } catch (error) {
      return userError(getErrorMessage(error));
    }

    return user!;
  } catch (error) {
    const message = getErrorMessage(error);
    return userError(message);
  }
}
