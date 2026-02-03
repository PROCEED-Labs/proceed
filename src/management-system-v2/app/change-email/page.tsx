import { getCurrentUser } from '@/components/auth';
import { getTokenHash, notExpired } from '@/lib/email-verification-tokens/utils';
import { getEmailVerificationToken } from '@/lib/data/db/iam/verification-tokens';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import ChangeEmailCard from './change-email-card';
import { Card } from 'antd';
import Link from 'next/link';
import Content from '@/components/content';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const searchParamsSchema = z.object({ email: z.string().email(), token: z.string() });

export default async function ChangeEmailPage(props: { searchParams: Promise<unknown> }) {
  const searchParams = await props.searchParams;
  const parsedSearchParams = searchParamsSchema.safeParse(searchParams);
  if (!parsedSearchParams.success) redirect('/');
  const { email, token } = parsedSearchParams.data;

  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { session } = currentUser.value;
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
  if (session.user.isGuest) redirect('/');
  const previousEmail = session.user.email;

  const verificationToken = await getEmailVerificationToken({
    identifier: email,
    token: await getTokenHash(token),
  });
  if (verificationToken.isErr()) {
    return errorResponse(verificationToken);
  }

  if (
    !verificationToken.value ||
    verificationToken.value.type !== 'change_email' ||
    verificationToken.value.userId !== userId ||
    !(await notExpired(verificationToken.value))
  )
    redirect('/');

  return (
    <Content title="Change Email Address">
      <ChangeEmailCard previousEmail={previousEmail} newEmail={email} />
    </Content>
  );
}
