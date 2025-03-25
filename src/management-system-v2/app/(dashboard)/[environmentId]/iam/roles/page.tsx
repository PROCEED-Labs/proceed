import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRoles, getUsersInRole } from '@/lib/data/DTOs';
import RolesPage from './role-page';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { AuthenticatedUser } from '@/lib/data/user-schema';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  if (!ability.can('manage', 'Role')) return <UnauthorizedFallback />;

  const roles = await getRoles(activeEnvironment.spaceId, ability);

  const extendedRoles = await asyncMap(roles, async (role) => {
    const roleUsers = await getUsersInRole(role.id, ability);
    const authenticatedMembers = roleUsers.filter(
      (member) => member && !member.isGuest,
    ) as AuthenticatedUser[];
    return {
      ...role,
      members: authenticatedMembers.map(({ id, firstName, lastName, username, email }) => ({
        id,
        firstName,
        lastName,
        username,
        email,
      })),
    };
  });

  return (
    <Content title="Identity and Access Management">
      <RolesPage roles={extendedRoles} />
    </Content>
  );
};

export default Page;
