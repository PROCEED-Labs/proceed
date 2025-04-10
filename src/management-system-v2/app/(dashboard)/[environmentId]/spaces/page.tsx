import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/db/iam/memberships';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import EnvironmentsPage from './environments-page';
import { getUserById } from '@/lib/data/db/iam/users';
import UnauthorizedFallback from '@/components/unauthorized-fallback';

const Page = async () => {
  const { userId } = await getCurrentUser();

  const user = await getUserById(userId);
  if (user?.isGuest) return <UnauthorizedFallback />;

  const environmentIds = await getUserOrganizationEnvironments(userId);
  const organizationEnvironments = (await Promise.all(
    environmentIds.map((environmentId: string) => getEnvironmentById(environmentId)),
  )) as OrganizationEnvironment[];

  return (
    <Content title="My Spaces">
      <EnvironmentsPage organizationEnvironments={organizationEnvironments} />
    </Content>
  );
};

export default Page;
