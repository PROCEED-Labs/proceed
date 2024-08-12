import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getProcesses } from '@/lib/data/legacy/_process';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { Card } from 'antd';
import { redirect } from 'next/navigation';
import TransferProcessesConfirmationButtons from './transfer-processes-confitmation-buttons';

export default async function TransferProcessesPage({
  searchParams,
}: {
  searchParams: {
    callbackUrl?: string;
    guestId?: string;
  };
}) {
  const { userId, session } = await getCurrentUser();
  if (!session) redirect('api/auth/signin');
  if (session.user.guest) redirect('/');

  const callbackUrl = searchParams.callbackUrl || '/';

  const guestId = searchParams.guestId;
  // guestId === userId if the user signed in with a non existing account, and the guest user was
  // turned into an authenticated user
  if (!guestId || guestId === userId) redirect(callbackUrl);

  const possibleGuest = getUserById(guestId);
  // possibleGuest might be a normal user, this would happen if the user signed in with a new
  // account, we only go further then this redirect, if the user signed in with an account that was
  // already linked to an existing user
  if (!possibleGuest || !possibleGuest.guest || possibleGuest?.signedInWithUserId !== userId)
    redirect(callbackUrl);

  // NOTE: this ignores folders
  const guestProcesses = (await getProcesses()).filter(
    (process) => process.environmentId === guestId,
  );
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
        <TransferProcessesConfirmationButtons guestId={guestId} callbackUrl={callbackUrl} />
      </Card>
    </Content>
  );
}
