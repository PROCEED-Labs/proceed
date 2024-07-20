import { getCurrentUser } from '@/components/auth';
import { getTokenHash, notExpired } from '@/lib/change-email/utils';
import { getVerificationToken } from '@/lib/data/legacy/verification-tokens';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import ChangeEmailCard from './change-email-card';

const searchParamsSchema = z.object({ email: z.string().email(), token: z.string() });

export default async function ChangeEmailPage({ searchParams }: { searchParams: unknown }) {
  const parsedSearchParams = searchParamsSchema.safeParse(searchParams);
  if (!parsedSearchParams.success) redirect('/');
  const { email, token } = parsedSearchParams.data;

  const { session } = await getCurrentUser();
  const userId = session?.user.id;
  if (!userId || session.user.guest) redirect('/');
  const previousEmail = session.user.email;

  const verificationToken = getVerificationToken({
    identifier: email,
    token: await getTokenHash(token),
  });

  if (
    !verificationToken ||
    !verificationToken.updateEmail ||
    verificationToken.userId !== userId ||
    !(await notExpired(verificationToken))
  )
    redirect('/');

  return <ChangeEmailCard previousEmail={previousEmail} newEmail={email} />;
}
