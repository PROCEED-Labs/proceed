import 'server-only';

import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from './ms-config/env-vars';
import { getEnvironmentById } from './data/db/iam/environments';
import { addMember, isMember } from './data/db/iam/memberships';
import { getUserByEmail } from './data/db/iam/users';
import { getRoleById } from './data/db/iam/roles';
import { addRoleMappings } from './data/db/iam/role-mappings';
import { syncOrganizationUsers } from './data/db/machine-config';
import { upsertUserOrganigram } from './data/db/iam/organigram';
import db from './data/db';

const baseInvitationSchema = {
  spaceId: z.string(),
  roleIds: z.array(z.string()).optional(),
  teamRoleId: z.string().optional(),
  backOfficeRoleId: z.string().optional(),
  directManagerId: z.string().optional(),
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
  const organization = await getEnvironmentById(invite.spaceId);
  if (!organization || !organization.isOrganization || !organization.isActive)
    return { error: 'InvalidOrganization' as const };

  const userId = 'userId' in invite ? invite.userId : (await getUserByEmail(invite.email))?.id;

  if (!userId) return { error: 'UserNotFound' as const };

  if (userIdAcceptingInvite && userIdAcceptingInvite !== userId)
    return { error: 'WrongUser' as const };

  if (!(await isMember(invite.spaceId, userId))) {
    addMember(invite.spaceId, userId);

    if (invite.roleIds) {
      const validRoles = [];
      for (const roleId of invite.roleIds) {
        // skip roles that have been deleted
        if (await getRoleById(roleId)) validRoles.push(roleId);
      }

      await addRoleMappings(
        validRoles.map((roleId) => ({
          environmentId: invite.spaceId,
          roleId,
          userId,
        })),
      );
    }

    // save directManagerId and associated role reference in organigram
    if (invite.teamRoleId || invite.backOfficeRoleId || invite.directManagerId) {
      const membership = await db.membership.findFirst({
        where: { userId, environmentId: invite.spaceId },
      });

      if (membership) {
        // directManagerId is already a membershipId from the frontend dropdown
        const directManagerMembershipId: string | null = invite.directManagerId ?? null;

        await upsertUserOrganigram({
          memberId: membership.id,
          directManagerId: directManagerMembershipId,
          teamRoleId: invite.teamRoleId ?? null,
          backOfficeRoleId: invite.backOfficeRoleId ?? null,
        });
      }
    }
  }

  await syncOrganizationUsers(organization.id);
}
