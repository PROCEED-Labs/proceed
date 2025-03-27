import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRoleWithMembersById } from '@/lib/data/DTOs';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getMembers } from '@/lib/data/DTOs';
import { getUserById } from '@/lib/data/DTOs';
import { Button, Card, Space, Tabs } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import RoleGeneralData from './roleGeneralData';
import RolePermissions from './rolePermissions';
import RoleMembers from './role-members';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import SpaceLink from '@/components/space-link';
import { getFolderById } from '@/lib/data/db/folders';

const Page = async ({
  params: { roleId, environmentId },
}: {
  params: { roleId: string; environmentId: string };
}) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);
  const role = await getRoleWithMembersById(roleId, ability);
  if (role && !ability.can('manage', toCaslResource('Role', role))) return <UnauthorizedFallback />;

  if (!role)
    return (
      <Content>
        <h1>Role not found</h1>
      </Content>
    );

  const usersInRole = role.members;
  const roleUserSet = new Set(usersInRole.map((member) => member.id));

  const memberships = await getMembers(activeEnvironment.spaceId, ability);
  const usersNotInRole = (await Promise.all(
    memberships
      .filter(({ userId }) => !roleUserSet.has(userId))
      .map((user) => getUserById(user.userId)),
  )) as AuthenticatedUser[];

  const roleParentFolder = role.parentId ? await getFolderById(role.parentId, ability) : undefined;

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
                children: <RoleGeneralData role={role} roleParentFolder={roleParentFolder} />,
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
