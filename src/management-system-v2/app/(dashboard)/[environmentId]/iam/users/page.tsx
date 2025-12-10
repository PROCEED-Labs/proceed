import { getCurrentEnvironment } from '@/components/auth';
import UsersPage from './users-page';
import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getFullMembersWithRoles } from '@/lib/data/db/iam/memberships';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  if (!ability.can('manage', 'User')) return <UnauthorizedFallback />;

  const users = await getFullMembersWithRoles(activeEnvironment.spaceId, ability);

  return (
    <Content title="Identity and Access Management">
      <UsersPage users={users} />
    </Content>
  );
};

export default Page;
