import z from 'zod';

const verificationTokenSchema = z.union([
  z.object({
    token: z.string(),
    identifier: z.string(),
    expires: z.date(),
    updateEmail: z.literal(false).optional(),
  }),
  z.object({
    token: z.string(),
    identifier: z.string(),
    expires: z.date(),
    updateEmail: z.literal(true),
    userId: z.string(),
  }),
]);

export type VerificationToken = z.infer<typeof verificationTokenSchema>;

export async function getVerificationToken(_: {
  identifier: string;
  token: string;
}): Promise<any> { }

export async function saveVerificationToken(_: {
  identifier: string;
  token: string;
  expires: Date;
}): Promise<any> { }

export async function deleteVerificationToken(_: {
  identifier: string;
  token: string;
}): Promise<any> { }
