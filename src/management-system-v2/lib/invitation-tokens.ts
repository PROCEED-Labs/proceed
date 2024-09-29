import { z } from 'zod';
import { env } from './env-vars';
import jwt from 'jsonwebtoken';

const baseInvitationSchema = {
  spaceId: z.string(),
  roleIds: z.array(z.string()).optional(),
};
const invitationSchema = z.union([
  z.object({ userId: z.string() }).extend(baseInvitationSchema),
  z.object({ email: z.string().email() }).extend(baseInvitationSchema),
]);

type Invitation = z.infer<typeof invitationSchema>;

export function generateInvitationToken(invitation: Invitation, expiration: Date) {
  // in seconds
  const expiresIn = (expiration.getTime() - Date.now()) / 1000;

  return jwt.sign(invitation, env.INVITATION_ENCRYPTION_SECRET, { expiresIn });
}

export function getInvitation(token: string) {
  try {
    const payload = jwt.verify(token, env.INVITATION_ENCRYPTION_SECRET);
    return invitationSchema.parse(payload);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError && error.name === 'TokenExpiredError') {
      return { error: 'TokenExpiredError' as const };
    }
    return { error: 'error' as const };
  }
}
