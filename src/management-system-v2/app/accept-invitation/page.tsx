import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { addMember, isMember } from '@/lib/data/db/iam/memberships';
import { addRoleMappings } from '@/lib/data/db/iam/role-mappings';
import { getRoleById } from '@/lib/data/db/iam/roles';
import { getUserByEmail } from '@/lib/data/db/iam/users';
import { acceptInvitation, getInvitation as getInvitationFromToken } from '@/lib/invitation-tokens';
import { Result, ResultProps } from 'antd';
import { redirect } from 'next/navigation';

function Error(props: ResultProps) {
  return (
    <Content>
      <Result status="error" {...props} />
    </Content>
  );
}

export default async function IvitationPage(props: { searchParams: Promise<{ token: string }> }) {
  const searchParams = await props.searchParams;
  const { session } = await getCurrentUser();
  if (!session)
    redirect(
      `/api/auth/signin?callbackUrl=${encodeURIComponent('/accept-invitation?token=' + searchParams.token)}`,
    );

  const invite = getInvitationFromToken(decodeURIComponent(searchParams.token));

  if ('error' in invite) {
    let tokenError = 'Wrong invitation';
    if (invite.error === 'TokenExpiredError') tokenError = 'Invitation expired';
    return <Error title={tokenError} />;
  }

  if (session.user.isGuest)
    return <Error title="Wrong user" subTitle="Sign in with the user to whom the token was sent" />;

  const result = await acceptInvitation(invite, session.user.id);

  if (result?.error === 'WrongUser')
    return <Error title="Wrong user" subTitle="Sign in with the user to whom the token was sent" />;

  if (result?.error === 'InvalidOrganization')
    return <Error title="This token is no longer valid" />;

  return redirect(`/${invite.spaceId}/processes`);
}
