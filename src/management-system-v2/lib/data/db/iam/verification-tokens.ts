import { z } from 'zod';
import db from '@/lib/data/db';

const verificationTokenSchema = z.object({
  token: z.string(),
  identifier: z.string(),
  expires: z.date(),
  userId: z.string().nullable().optional(),
});

export type VerificationToken = z.infer<typeof verificationTokenSchema>;

export async function getVerificationToken({
  token,
  identifier,
}: {
  token: string;
  identifier: string;
}) {
  return await db.verificationToken.findFirst({
    where: {
      token,
      identifier,
    },
  });
}

export async function deleteVerificationToken({
  token,
  identifier,
}: {
  token: string;
  identifier: string;
}) {
  const result = await db.verificationToken.delete({
    where: { token, identifier },
  });

  if (!result) throw new Error('Token not found');

  return result;
}

export async function saveVerificationToken(tokenInput: VerificationToken) {
  const token = verificationTokenSchema.parse(tokenInput);

  return await db.verificationToken.create({
    data: token,
  });
}
