import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getProcesses } from '@/lib/data/db/process';
import { getUserById } from '@/lib/data/db/iam/users';
import { Card, Result } from 'antd';
import { redirect } from 'next/navigation';
import ProcessTransferButtons from './transfer-processes-confirmation-buttons';
import { getGuestReference } from '@/lib/reference-guest-user-token';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

export default async function TransferProcessesPage(props: {
  searchParams: Promise<{
    callbackUrl?: string;
    referenceToken?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { userId, session } = currentUser.value;
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
  if (possibleGuest.isErr()) {
    return errorResponse(possibleGuest);
  }
  // possibleGuest might be a normal user, this would happen if the user signed in with an existing
  // accocunt, generating the token above, and before using it, he signed in with a new account.
  // We only go further then this redirect, if the user signed in with an account that was
  // already linked to an existing user
  if (!possibleGuest.value?.isGuest) redirect(callbackUrl);

  // NOTE: this ignores folders
  const guestProcesses = await getProcesses(guestId);
  if (guestProcesses.isErr()) {
    return errorResponse(guestProcesses);
  }

  // If the guest has no processes -> nothing to do
  if (guestProcesses.value.length === 0) redirect(callbackUrl);

  return (
    <Content title="Transfer Processes">
      <Card
        title="Would you like to transfer your processes?"
        style={{ maxWidth: '70ch', margin: 'auto' }}
      >
        Your guest account had {guestProcesses.value.length} process
        {guestProcesses.value.length !== 1 && 'es'}.
        <br />
        Would you like to transfer them to your account?
        <ProcessTransferButtons referenceToken={token} callbackUrl={callbackUrl} />
      </Card>
    </Content>
  );
}
