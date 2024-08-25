'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { UserErrorType, userError } from '../user-error';
import { z } from 'zod';
import { enableUseDB } from 'FeatureFlags';

let getUserByEmail: any, addMember: any, removeMember: any;

// Function to load modules based on feature flag
const loadModules = async () => {
  const [userModuleImport, membershipModuleImport] = await Promise.all([
    enableUseDB ? import('./db/iam/users') : import('./legacy/iam/users'),
    enableUseDB ? import('./db/iam/memberships') : import('./legacy/iam/memberships'),
  ]);

  getUserByEmail = userModuleImport.getUserByEmail;
  addMember = membershipModuleImport.addMember;
  removeMember = membershipModuleImport.removeMember;
};

loadModules().catch(console.error);

const EmailListSchema = z.array(z.string().email());

export async function inviteUsersToEnvironment(
  environmentId: string,
  invitedEmailsInput: string[],
) {
  try {
    const invitedEmails = EmailListSchema.parse(invitedEmailsInput);

    const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

    // TODO refine ability check

    // ability check disallows from adding to personal environments
    if (!ability.can('create', 'User'))
      return userError(
        'You do not have permission to invite users to this environment',
        UserErrorType.PermissionError,
      );

    for (const invitedEmail of invitedEmails) {
      const invitedUser = await getUserByEmail(invitedEmail);

      // TODO: don't directly add users to the environment, send them an email with a link to join

      // don't return an error if the user doesn't exist
      // to avoid users from finding out who, what emails are registered
      if (invitedUser) {
        addMember(activeEnvironment.spaceId, invitedUser.id);
      }
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
      removeMember(environmentId, userId, ability);
    }
  } catch (_) {
    return userError('Error removing users from environment');
  }
}
