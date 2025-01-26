import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getProcesses, getUserById } from '@/lib/data/DTOs';
import { Card, Result } from 'antd';
import { redirect } from 'next/navigation';
import ProcessTransferButtons from './transfer-processes-confirmation-buttons';
import { getGuestReference } from '@/lib/reference-guest-user-token';

export default async function TransferProcessesPage({
  searchParams,
}: {
  searchParams: {
    callbackUrl?: string;
    referenceToken?: string;
  };
}) {
  const { userId, session } = await getCurrentUser();
  if (!session) redirect('api/auth/signin');
  if (session.user.isGuest) redirect('/');

  const callbackUrl = decodeURIComponent(searchParams.callbackUrl || '/');

  const token = decodeURIComponent(searchParams.referenceToken || '');
  const referenceToken = getGuestReference(token);
  if ('error' in referenceToken) {
    let message = 'Invalid link';
    if (referenceToken.error === 'TokenExpiredError') message = 'Link expired';

    return (
      <Content title="Transfer Processes">
        <Result
          status="error"
          title={message}
          subTitle="If you want to transfer the processes from your guest account, you need to sign in with your email from your guest account again."
        />
      </Content>
    );
  }
  const guestId = referenceToken.guestId;

  // guestId === userId if the user signed in with a non existing account, and the guest user was
  // turned into an authenticated user
  if (!guestId || guestId === userId) redirect(callbackUrl);

  const possibleGuest = await getUserById(guestId);
  // possibleGuest might be a normal user, this would happen if the user signed in with an existing
  // accocunt, generating the token above, and before using it, he signed in with a new account.
  // We only go further then this redirect, if the user signed in with an account that was
  // already linked to an existing user
  if (!possibleGuest || !possibleGuest.isGuest) redirect(callbackUrl);

  // NOTE: this ignores folders
  const guestProcesses = await getProcesses(guestId);

  // If the guest has no processes -> nothing to do
  if (guestProcesses.length === 0) redirect(callbackUrl);

  return (
    <Content title="Transfer Processes">
      <Card
        title="Would you like to transfer your processes?"
        style={{ maxWidth: '70ch', margin: 'auto' }}
      >
        Your guest account had {guestProcesses.length} process{guestProcesses.length !== 1 && 'es'}.
        <br />
        Would you like to transfer them to your account?
        <ProcessTransferButtons referenceToken={token} callbackUrl={callbackUrl} />
      </Card>
    </Content>
  );
}
