import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRoles } from '@/lib/data/legacy/iam/roles';
import RolesPage from './role-page';
import UnauthorizedFallback from '@/components/unauthorized-fallback';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  if (!ability.can('manage', 'Role')) return <UnauthorizedFallback />;

  const roles = getRoles(activeEnvironment, ability);

  return (
    <Content title="Identity and Access Management">
      <RolesPage roles={roles} />
    </Content>
  );
};

export default Page;
