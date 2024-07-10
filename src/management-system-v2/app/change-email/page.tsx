import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { requestEmailChange } from '@/lib/change-email/server-actions';
import { getTokenHash, notExpired } from '@/lib/change-email/utils';
import { getVerificationToken } from '@/lib/data/legacy/verification-tokens';
import { Button, Card, Space } from 'antd';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import ConfirmationButtons from './confirmation-buttons';

const searchParamsScema = z.object({ email: z.string().email(), token: z.string() });

export default async function ChangeEmailPage({ searchParams }: { searchParams: unknown }) {
  const parsedSearchkParams = searchParamsScema.safeParse(searchParams);
  if (!parsedSearchkParams.success) redirect('/');
  const { email, token } = parsedSearchkParams.data;

  const { session } = await getCurrentUser();
  const userId = session?.user.id;
  if (!userId) redirect('/');

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
    <Content title="Change Email">
      <Card title="Confirm Email change">
        <ConfirmationButtons />
      </Card>
    </Content>
  );
}
