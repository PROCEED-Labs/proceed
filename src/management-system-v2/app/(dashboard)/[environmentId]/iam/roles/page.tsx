import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRolesWithMembers } from '@/lib/data/DTOs';
import RolesPage from './role-page';
import UnauthorizedFallback from '@/components/unauthorized-fallback';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  if (!ability.can('manage', 'Role')) return <UnauthorizedFallback />;

  const roles = await getRolesWithMembers(activeEnvironment.spaceId, ability);

  return (
    <Content title="Identity and Access Management">
      <RolesPage roles={roles} />
    </Content>
  );
};

export default Page;
