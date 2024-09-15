import { getCurrentUser } from '@/components/auth';
import { getTokenHash, notExpired } from '@/lib/change-email/utils';
import { getVerificationToken } from '@/lib/data/legacy/verification-tokens';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import ChangeEmailCard from './change-email-card';
import { Card } from 'antd';
import Link from 'next/link';
import Content from '@/components/content';

const searchParamsSchema = z.object({ email: z.string().email(), token: z.string() });

export default async function ChangeEmailPage({ searchParams }: { searchParams: unknown }) {
  const parsedSearchParams = searchParamsSchema.safeParse(searchParams);
  if (!parsedSearchParams.success) redirect('/');
  const { email, token } = parsedSearchParams.data;

  const { session } = await getCurrentUser();
  const userId = session?.user.id;
  if (!userId)
    return (
      <Content title="Change Email Address">
        <Card title="You need to sign in" style={{ maxWidth: '70ch', margin: 'auto' }}>
          If you're trying to change your email address yo need to{' '}
          <Link
            href={
              '/signin?callbackUrl=' +
              encodeURIComponent(`/change-email?email=${email}&token=${token}`)
            }
          >
            sign in
          </Link>{' '}
          first.
        </Card>
      </Content>
    );
  if (session.user.guest) redirect('/');
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

  return (
    <Content title="Change Email Address">
      <ChangeEmailCard previousEmail={previousEmail} newEmail={email} />
    </Content>
  );
}
