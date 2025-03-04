import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEnvironmentById } from '@/lib/data/DTOs';
import { addMember, isMember } from '@/lib/data/db/iam/memberships';
import { addRoleMappings } from '@/lib/data/db/iam/role-mappings';
import { getRoleById } from '@/lib/data/db/iam/roles';
import { getUserByEmail } from '@/lib/data/db/iam/users';
import { getInvitation as getInvitationFromToken } from '@/lib/invitation-tokens';
import { Result, ResultProps } from 'antd';
import { redirect } from 'next/navigation';

function Error(props: ResultProps) {
  return (
    <Content>
      <Result status="error" {...props} />
    </Content>
  );
}

export default async function IvitationPage({ searchParams }: { searchParams: { token: string } }) {
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

  const userId = 'userId' in invite ? invite.userId : (await getUserByEmail(invite.email))?.id;
  if (session.user.isGuest || !userId || userId !== session.user.id)
    return <Error title="Wrong user" subTitle="Sign in with the user to whom the token was sent" />;

  const organization = await getEnvironmentById(invite.spaceId);
  if (!organization || !organization.isOrganization || !organization.isActive)
    return <Error title="This token is no longer valid" />;

  if (!(await isMember(invite.spaceId, userId))) {
    addMember(invite.spaceId, userId);

    if (invite.roleIds) {
      const validRoles = [];
      for (const roleId of invite.roleIds) {
        // skip roles that have been deleted
        if (await getRoleById(roleId)) validRoles.push(roleId);
      }

      addRoleMappings(
        validRoles.map((roleId) => ({
          environmentId: invite.spaceId,
          roleId,
          userId,
        })),
      );
    }
  }

  return redirect(`/${invite.spaceId}/processes`);
}
