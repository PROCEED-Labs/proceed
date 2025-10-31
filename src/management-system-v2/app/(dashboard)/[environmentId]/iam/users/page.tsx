import { getCurrentEnvironment } from '@/components/auth';
import UsersPage from './users-page';
import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getMembers } from '@/lib/data/db/iam/memberships';
import { getUserById } from '@/lib/data/db/iam/users';
import { AuthenticatedUser, User } from '@/lib/data/user-schema';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  if (!ability.can('manage', 'User')) return <UnauthorizedFallback />;

  const memberships = await getMembers(activeEnvironment.spaceId, ability);
  const users = (await asyncMap<(typeof memberships)[0], User>(memberships, (user) =>
    getUserById(user.userId),
  )) as AuthenticatedUser[];

  return (
    <Content title="Identity and Access Management">
      <UsersPage users={users} />
    </Content>
  );
};

export default Page;
