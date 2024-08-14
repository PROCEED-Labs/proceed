import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRoleById } from '@/lib/data/legacy/iam/roles';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getMemebers } from '@/lib/data/legacy/iam/memberships';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { Button, Card, Space, Tabs } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import RoleGeneralData from './roleGeneralData';
import RolePermissions from './rolePermissions';
import RoleMembers from './role-members';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import SpaceLink from '@/components/space-link';

const Page = async ({
  params: { roleId, environmentId },
}: {
  params: { roleId: string; environmentId: string };
}) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);
  const role = getRoleById(roleId, ability);

  if (!role)
    return (
      <Content>
        <h1>Role not found</h1>
      </Content>
    );

  if (!ability.can('manage', toCaslResource('Role', role))) return <UnauthorizedFallback />;

  const usersInRole = role.members.map((member) =>
    getUserById(member.userId),
  ) as AuthenticatedUser[];
  const roleUserSet = new Set(usersInRole.map((member) => member.id));

  const memberships = getMemebers(activeEnvironment.spaceId, ability);
  const usersNotInRole = memberships
    .filter(({ userId }) => !roleUserSet.has(userId))
    .map((user) => getUserById(user.userId)) as AuthenticatedUser[];

  return (
    <Content
      title={
        <Space>
          <SpaceLink href={`/iam/roles`}>
            <Button icon={<LeftOutlined />} type="text">
              Roles
            </Button>
          </SpaceLink>
          {role?.name}
        </Space>
      }
    >
      <div style={{ maxWidth: '800px', margin: 'auto' }}>
        <Card>
          <Tabs
            items={[
              {
                key: 'generalData',
                label: 'General Data',
                children: <RoleGeneralData role={role} />,
              },
              {
                key: 'permissions',
                label: 'Permissions',
                children: <RolePermissions role={role} />,
              },
              {
                key: 'members',
                label: 'Manage Members',
                children: (
                  <RoleMembers
                    role={role}
                    usersNotInRole={usersNotInRole}
                    usersInRole={usersInRole}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    </Content>
  );
};

export default Page;
