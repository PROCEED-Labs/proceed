import { getCurrentEnvironment } from '@/components/auth';
import UsersPage from './users-page';
import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getMembers } from '@/lib/data/db/iam/memberships';
import { getUserById } from '@/lib/data/db/iam/users';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { Result } from 'neverthrow';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability, activeEnvironment } = currentSpace.value;
  if (!ability.can('manage', 'User')) return <UnauthorizedFallback />;

  const memberships = await getMembers(activeEnvironment.spaceId, ability);
  if (memberships.isErr()) {
    return errorResponse(memberships);
  }

  const users = Result.combine(
    await asyncMap(memberships.value, (user) => getUserById(user.userId)),
  );
  if (users.isErr()) {
    return errorResponse(users);
  }

  return (
    <Content title="Identity and Access Management">
      <UsersPage users={users.value as AuthenticatedUser[]} />
    </Content>
  );
};

export default Page;
