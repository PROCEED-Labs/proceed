import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/db/iam/memberships';
import EnvironmentsPage from './environments-page';
import { getUserById } from '@/lib/data/db/iam/users';
import UnauthorizedFallback from '@/components/unauthorized-fallback';

const Page = async () => {
  const { userId } = await getCurrentUser();

  const user = await getUserById(userId);
  if (user?.isGuest) return <UnauthorizedFallback />;

  const environmentIds = await getUserOrganizationEnvironments(userId);
  const userSpaces = (await Promise.all(
    environmentIds.map((environmentId: string) => getEnvironmentById(environmentId)),
  )) as { id: string; name: string; description: string; isOrganization: boolean }[];
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
