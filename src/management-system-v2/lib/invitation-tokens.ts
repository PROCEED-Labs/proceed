import 'server-only';

import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from './ms-config/env-vars';
import { getEnvironmentById } from './data/db/iam/environments';
import { addMember, isMember } from './data/db/iam/memberships';
import { getUserByEmail } from './data/db/iam/users';
import { getRoleById } from './data/db/iam/roles';
import { addRoleMappings } from './data/db/iam/role-mappings';
import { getErrorMessage, userError } from './server-error-handling/user-error';

const baseInvitationSchema = {
  spaceId: z.string(),
  roleIds: z.array(z.string()).optional(),
};
const invitationSchema = z.union([
  z.object({ userId: z.string() }).extend(baseInvitationSchema),
  z.object({ email: z.string().email() }).extend(baseInvitationSchema),
]);

export type Invitation = z.infer<typeof invitationSchema>;

export function generateInvitationToken(invitation: Invitation, expiration: Date) {
  // in seconds
  const expiresIn = (expiration.getTime() - Date.now()) / 1000;

  return jwt.sign(invitation, env.IAM_ORG_USER_INVITATION_ENCRYPTION_SECRET, { expiresIn });
}

export function getInvitation(token: string) {
  try {
    const payload = jwt.verify(token, env.IAM_ORG_USER_INVITATION_ENCRYPTION_SECRET);
    return invitationSchema.parse(payload);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError && error.name === 'TokenExpiredError') {
      return { error: 'TokenExpiredError' as const };
    }
    return { error: 'error' as const };
  }
}

export async function acceptInvitation(invite: Invitation, userIdAcceptingInvite?: string) {
  const _organization = await getEnvironmentById(invite.spaceId);
  if (_organization.isErr()) return userError(getErrorMessage(_organization.error));
  const organization = _organization.value;

  if (!organization || !organization.isOrganization || !organization.isActive)
    return { error: 'InvalidOrganization' as const };

  let userId;
  if ('userId' in invite) {
    userId = invite.userId;
  } else {
    const userByEmail = await getUserByEmail(invite.email);
    if (userByEmail.isErr()) return userError(getErrorMessage(userByEmail.error));
    if (!userByEmail.value) return userError('User not found');

    userId = userByEmail.value.id;
  }

  if (!userId) return { error: 'UserNotFound' as const };

  if (userIdAcceptingInvite && userIdAcceptingInvite !== userId)
    return { error: 'WrongUser' as const };

  const userIsMember = await isMember(invite.spaceId, userId);
  if (userIsMember.isErr()) return userError(getErrorMessage(userIsMember.error));

  if (!userIsMember.value) {
    const memberAdded = await addMember(invite.spaceId, userId);
    if (memberAdded.isErr()) return userError(getErrorMessage(memberAdded.error));

    if (invite.roleIds) {
      const validRoles = [];
      for (const roleId of invite.roleIds) {
        // skip roles that have been deleted
        const role = await getRoleById(roleId);
        if (role.isOk() && role.value) validRoles.push(roleId);
      }

      const result = await addRoleMappings(
        validRoles.map((roleId) => ({
          environmentId: invite.spaceId,
          roleId,
          userId,
        })),
      );
      if (result.isErr()) return userError(getErrorMessage(result.error));
    }
  }
}
