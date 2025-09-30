import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRoleWithMembersById } from '@/lib/data/db/iam/roles';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getMembers } from '@/lib/data/db/iam/memberships';
import { getUserById } from '@/lib/data/db/iam/users';
import { Button, Card, Result, Space, Tabs } from 'antd';
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
  // if (role && !ability.can('manage', toCaslResource('Role', role))) return <UnauthorizedFallback />;
  if (!ability.can('admin', 'All')) return <UnauthorizedFallback />;

  if (!role)
    return (
      <Content>
        <Result
          status="404"
          title="Role not found"
          subTitle="Sorry, the page you visited does not exist."
          extra={
            <SpaceLink href={`/iam/roles`}>
              <Button type="primary">Back to Roles</Button>
            </SpaceLink>
          }
        />
        );
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

  const tabs = [
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
  ];

  if (role.name !== '@everyone' && role.name !== '@guest') {
    tabs.push({
      key: 'members',
      label: 'Manage Members',
      children: (
        <RoleMembers role={role} usersNotInRole={usersNotInRole} usersInRole={usersInRole} />
      ),
    });
  }

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
          <Tabs items={tabs} />
        </Card>
      </div>
    </Content>
  );
};

export default Page;
