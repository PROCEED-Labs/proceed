import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getRoleWithMembersById } from '@/lib/data/db/iam/roles';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getMembers } from '@/lib/data/db/iam/memberships';
import { getUserById } from '@/lib/data/db/iam/users';
import { Button, Card, Result as AntdResult, Space, Tabs } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import RoleGeneralData from './roleGeneralData';
import RolePermissions from './rolePermissions';
import RoleMembers from './role-members';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import SpaceLink from '@/components/space-link';
import { getFolderById } from '@/lib/data/db/folders';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { Result } from 'neverthrow';

const Page = async ({
  params: { roleId, environmentId },
}: {
  params: { roleId: string; environmentId: string };
}) => {
  const currentSpace = await getCurrentEnvironment(environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability, activeEnvironment } = currentSpace.value;
  const role = await getRoleWithMembersById(roleId, ability);
  if (role.isErr()) {
    return errorResponse(role);
  }

  // if (role && !ability.can('manage', toCaslResource('Role', role))) return <UnauthorizedFallback />;
  if (!ability.can('admin', 'All')) return <UnauthorizedFallback />;

  if (!role.value)
    return (
      <Content>
        <AntdResult
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

  const usersInRole = role.value.members;
  const roleUserSet = new Set(usersInRole.map((member) => member.id));

  const memberships = await getMembers(activeEnvironment.spaceId, ability);
  if (memberships.isErr()) return errorResponse(memberships);

  const usersNotInRole = Result.combine(
    await Promise.all(
      memberships.value
        .filter(({ userId }) => !roleUserSet.has(userId))
        .map((user) => getUserById(user.userId)),
    ),
  );
  if (usersNotInRole.isErr()) {
    return errorResponse(usersNotInRole);
  }

  const roleParentFolder = role.value.parentId
    ? await getFolderById(role.value.parentId, ability)
    : undefined;
  if (roleParentFolder && roleParentFolder.isErr()) {
    return roleParentFolder;
  }

  const tabs = [
    {
      key: 'generalData',
      label: 'General Data',
      children: <RoleGeneralData role={role.value} roleParentFolder={roleParentFolder?.value} />,
    },
    {
      key: 'permissions',
      label: 'Permissions',
      children: <RolePermissions role={role.value} />,
    },
  ];

  if (role.value.name !== '@everyone' && role.value.name !== '@guest') {
    tabs.push({
      key: 'members',
      label: 'Manage Members',
      children: (
        <RoleMembers
          role={role.value}
          usersNotInRole={usersNotInRole.value as AuthenticatedUser[]}
          usersInRole={usersInRole}
        />
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
          {role.value.name}
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
