import { getCurrentEnvironment } from '@/components/auth';
import UsersPage from './users-page';
import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getFullMembersWithRoles } from '@/lib/data/db/iam/memberships';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability, activeEnvironment } = currentSpace.value;
  if (!ability.can('manage', 'User')) return <UnauthorizedFallback />;

  const users = await getFullMembersWithRoles(activeEnvironment.spaceId, ability);
  if (users.isErr()) return errorResponse(users);

  return (
    <Content title="Identity and Access Management">
      <UsersPage users={users.value} />
    </Content>
  );
};

export default Page;
