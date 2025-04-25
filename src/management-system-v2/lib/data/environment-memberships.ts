'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { UserErrorType, userError } from '../user-error';
import { z } from 'zod';
import { env } from '@/lib/env-vars';
import { sendEmail } from '../email/mailer';
import renderOrganizationInviteEmail from '../organization-invite-email';
import { OrganizationEnvironment } from './environment-schema';
import { generateInvitationToken } from '../invitation-tokens';
import { toCaslResource } from '../ability/caslAbility';
import { getRoleById } from '@/lib/data/db/iam/roles';
import { type RoleMapping } from '@/lib/data/db/iam/role-mappings';
import { getUserByEmail } from '@/lib/data/db/iam/users';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { isMember, removeMember } from '@/lib/data/db/iam/memberships';

const EmailListSchema = z.array(z.string().email());

/** 30 days in ms */
const invitationExpirationTime = 30 * 24 * 60 * 60 * 1000;

export async function inviteUsersToEnvironment(
  environmentId: string,
  invitedEmailsInput: string[],
  roleIds?: string[],
) {
  try {
    const invitedEmails = EmailListSchema.parse(invitedEmailsInput);

    const { ability } = await getCurrentEnvironment(environmentId);

    const organization = (await getEnvironmentById(environmentId)) as OrganizationEnvironment;

    // ability check disallows from adding to personal environments
    if (!ability.can('create', 'User'))
      return userError(
        'You do not have permission to invite users to this environment',
        UserErrorType.PermissionError,
      );

    const filteredRoles = roleIds?.filter(async (roleId) => {
      return (
        ability.can('manage', toCaslResource('Role', await getRoleById(roleId))) &&
        ability.can(
          'create',
          toCaslResource('RoleMapping', { userId: '', roleId } satisfies Partial<RoleMapping>),
          { environmentId },
        )
      );
    });

    for (const invitedEmail of invitedEmails) {
      const invitedUser = await getUserByEmail(invitedEmail);
      if (invitedUser && (await isMember(environmentId, invitedUser.id))) continue;

      const expirationDate = new Date(Date.now() + invitationExpirationTime);

      const invitationToken = generateInvitationToken(
        {
          spaceId: environmentId,
          roleIds: filteredRoles,
          ...(invitedUser ? { userId: invitedUser.id } : { email: invitedEmail }),
        },
        expirationDate,
      );

      const invitationEmail = renderOrganizationInviteEmail({
        acceptInviteLink: `${env.NEXTAUTH_URL}/accept-invitation?token=${invitationToken}`,
        expires: expirationDate,
        organizationName: organization.name,
      });

      sendEmail({
        to: invitedEmail,
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

    const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

    // TODO refine ability check

    // TODO disallow removing self ?

    // ability check disallows from removing to personal environments
    if (!ability.can('delete', 'User'))
      return userError(
        'You do not have permission to remove users from this environment',
        UserErrorType.PermissionError,
      );

    for (const userId of userIds) {
      await removeMember(environmentId, userId, ability);
    }
  } catch (_) {
    return userError('Error removing users from environment');
  }
}
