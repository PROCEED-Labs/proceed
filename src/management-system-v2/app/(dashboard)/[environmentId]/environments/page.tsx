import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import EnvironmentsPage from './environemnts-page';
import { getUserById } from '@/lib/data/legacy/iam/users';
import UnauthorizedFallback from '@/components/unauthorized-fallback';

const Page = async () => {
  const { userId } = await getCurrentUser();

  const user = await getUserById(userId);
  if (user?.isGuest) return <UnauthorizedFallback />;

  const environmentIds = await getUserOrganizationEnvironments(userId);
  console.log(environmentIds);

  const organizationEnvironments = (await Promise.all(
    environmentIds.map((environmentId: string) => getEnvironmentById(environmentId)),
  )) as OrganizationEnvironment[];

  return (
    <Content title="My Environments">
      <EnvironmentsPage organizationEnvironments={organizationEnvironments} />
    </Content>
  );
};

export default Page;
