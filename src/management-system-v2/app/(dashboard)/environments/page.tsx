import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnviroments } from '@/lib/data/legacy/iam/memberships';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import EnvironmentsPage from './environemnts-page';

const Page = async () => {
  const { session } = await getCurrentUser();
  const userId = session?.user.id || '';

  const organizationEnvironments = getUserOrganizationEnviroments(userId).map((environmentId) =>
    getEnvironmentById(environmentId),
  ) as OrganizationEnvironment[];

  return (
    <Content title="My Environments">
      <EnvironmentsPage organizationEnvironments={organizationEnvironments} />
    </Content>
  );
};

export default Page;
