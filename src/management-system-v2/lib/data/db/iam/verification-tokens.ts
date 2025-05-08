import { z } from 'zod';
import db from '@/lib/data/db';

const baseEmailVerificationTokenSchema = z.object({
  token: z.string().email(),
  identifier: z.string(),
  expires: z.date(),
});

const emailVerificationTokenSchemam = z.union([
  baseEmailVerificationTokenSchema.extend({
    type: z.literal('signin_with_email'),
  }),
  baseEmailVerificationTokenSchema.extend({
    type: z.literal('change_email'),
    userId: z.string(),
  }),
  baseEmailVerificationTokenSchema.extend({
    type: z.literal('register_new_user'),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    passwordHash: z.string().optional(),
  }),
]);

export type EmailVerificationToken = z.infer<typeof emailVerificationTokenSchemam>;

export async function getEmailVerificationToken({
  token,
  identifier,
}: {
  token: string;
  identifier: string;
}) {
  return (await db.emailVerificationToken.findFirst({
    where: {
      token,
      identifier,
    },
  })) as EmailVerificationToken | null;
}

export async function deleteEmailVerificationToken({
  token,
  identifier,
}: {
  token: string;
  identifier: string;
}) {
  const result = await db.emailVerificationToken.delete({
    where: { token, identifier },
  });

  if (!result) throw new Error('Token not found');

  return result;
}

export async function saveEmailVerificationToken(tokenInput: EmailVerificationToken) {
  const token = emailVerificationTokenSchemam.parse(tokenInput);

  return await db.emailVerificationToken.create({
    data: token,
  });
}
