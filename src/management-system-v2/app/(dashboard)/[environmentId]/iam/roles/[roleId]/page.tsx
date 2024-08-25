import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRoleById } from '@/lib/data/legacy/iam/roles';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { toCaslResource } from '@/lib/ability/caslAbility';
import RoleId from './role-id-page';
import { getMembers } from '@/lib/data/legacy/iam/memberships';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { AuthenticatedUser } from '@/lib/data/user-schema';

const Page = async ({
  params: { roleId, environmentId },
}: {
  params: { roleId: string; environmentId: string };
}) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);
  const role = await getRoleById(roleId, ability);

  if (!role)
    return (
      <Content>
        <h1>Role not found</h1>
      </Content>
    );

  const usersInRole = (await Promise.all(
    role.members.map((member) => getUserById(member.userId)),
  )) as AuthenticatedUser[];
  const roleUserSet = new Set(usersInRole.map((member) => member.id));

  const memberships = await getMembers(activeEnvironment.spaceId, ability);
  const usersNotInRole = (await Promise.all(
    memberships
      .filter(({ userId }) => !roleUserSet.has(userId))
      .map((user) => getUserById(user.userId)),
  )) as AuthenticatedUser[];

  if (!ability.can('manage', toCaslResource('Role', role))) return <UnauthorizedFallback />;

  return <RoleId role={role} usersNotInRole={usersNotInRole} usersInRole={usersInRole} />;
};

export default Page;
