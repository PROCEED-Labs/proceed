import { getCurrentEnvironment } from '@/components/auth';
import UsersPage from './users-page';
import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getMemebers } from '@/lib/data/legacy/iam/memberships';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { ComponentProps } from 'react';
import { getRoleMappingByUserId } from '@/lib/data/legacy/iam/role-mappings';
import { getRoleById } from '@/lib/data/legacy/iam/roles';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  if (!ability.can('manage', 'User')) return <UnauthorizedFallback />;

  const memberships = getMemebers(activeEnvironment.spaceId, ability);
  const users: ComponentProps<typeof UsersPage>['users'] = memberships.map((user) =>
    getUserById(user.userId),
  ) as AuthenticatedUser[];

  for (const user of users) {
    const mappings = getRoleMappingByUserId(user.id, activeEnvironment.spaceId);
    if (mappings.length > 0) user.roles = mappings.map((mapping) => getRoleById(mapping.roleId));
  }

  return (
    <Content title="Identity and Access Management">
      <UsersPage users={users} />
    </Content>
  );
};

export default Page;
