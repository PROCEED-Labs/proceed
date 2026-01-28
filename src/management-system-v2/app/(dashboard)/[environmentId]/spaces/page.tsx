import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/db/iam/memberships';
import EnvironmentsPage from './environments-page';
import { getUserById } from '@/lib/data/db/iam/users';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { Result } from 'neverthrow';

const Page = async () => {
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { userId } = currentUser.value;

  const user = await getUserById(userId);
  if (user.isErr()) return errorResponse(user);
  if (user.value?.isGuest) return <UnauthorizedFallback />;

  const environmentIds = await getUserOrganizationEnvironments(userId);
  if (environmentIds.isErr()) return errorResponse(environmentIds);

  const _userSpaces = Result.combine(
    await Promise.all(
      environmentIds.value.map((environmentId: string) => getEnvironmentById(environmentId)),
    ),
  );
  if (_userSpaces.isErr()) return errorResponse(_userSpaces);

  const userSpaces = _userSpaces.value as {
    id: string;
    name: string;
    description: string;
    isOrganization: boolean;
  }[];

  userSpaces.unshift({
    id: userId,
    name: 'My Personal Space',
    description: '',
    isOrganization: false,
  });

  return (
    <Content title="My Spaces">
      <EnvironmentsPage spaces={userSpaces} />
    </Content>
  );
};

export default Page;
