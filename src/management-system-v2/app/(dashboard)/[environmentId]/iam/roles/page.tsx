import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import RolesPage from './role-page';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability, activeEnvironment } = currentSpace.value;

  // if (!ability.can('manage', 'Role')) return <UnauthorizedFallback />;
  if (!ability.can('admin', 'All')) return <UnauthorizedFallback />;

  const roles = await getRolesWithMembers(activeEnvironment.spaceId, ability);
  if (roles.isErr()) {
    return errorResponse(roles);
  }

  return (
    <Content title="Identity and Access Management">
      <RolesPage roles={roles.value} />
    </Content>
  );
};

export default Page;
