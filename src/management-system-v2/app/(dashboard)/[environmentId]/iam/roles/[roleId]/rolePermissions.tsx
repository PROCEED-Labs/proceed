'use client';

import { Divider, Form, Row, Space, Switch, Typography, App, Button } from 'antd';
import { SaveOutlined, LoadingOutlined } from '@ant-design/icons';
import { ResourceActionType } from '@/lib/ability/caslAbility';
import { FC, Fragment, useEffect, useState } from 'react';
import { switchChecked, switchDisabled, togglePermission } from './role-permissions-helper';
import { useAbilityStore } from '@/lib/abilityStore';
import { updateRole as serverUpdateRole } from '@/lib/data/roles';
import { Role } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import { UserErrorType } from '@/lib/user-error';

type PermissionCategory = {
  key: string;
  title: string;
  resource: keyof Role['permissions'];
  permissions: {
    key: string;
    title: string;
    description: string;
    permission: ResourceActionType;
  }[];
};

const basePermissionOptions: PermissionCategory[] = [
  {
    key: 'environment',
    title: 'ENVIRONMENT',
    resource: 'Environment',
    permissions: [
      {
        key: 'Update Environment Information',
        title: 'Update Environment Information',
        description: 'Allows a user to update the environment information.',
        permission: 'update',
      },
      {
        key: 'Manage Environment',
        title: 'Manage Environment',
        description: 'Allows a user to update and delete the Environment.',
        permission: 'manage',
      },
    ],
  },
  {
    key: 'process',
    title: 'PROCESSES',
    resource: 'Process',
    permissions: [
      {
        key: 'process_view',
        title: 'View processes',
        description: 'Allows a user to view her or his processes. (Enables the Processes view.)',
        permission: 'view',
      },
      {
        key: 'process_manage',
        title: 'Manage processes',
        description: 'Allows a user to create, modify and delete processes in the Processes view.',
        permission: 'manage',
      },
      {
        key: 'process_admin',
        title: 'Administrate processes',
        description: 'Allows a user to create, modify, delete and share all PROCEED processes.',
        permission: 'admin',
      },
    ],
  },
  {
    key: 'projects',
    title: 'PROJECTS',
    resource: 'Project',
    permissions: [
      {
        key: 'View projects',
        title: 'View projects',
        description: 'Allows a user to view her or his projects. (Enables the Projects view.)',
        permission: 'view',
      },
      {
        key: 'Manage projects',
        title: 'Manage projects',
        description: 'Allows a user to create, modify and delete projects in the Projects view.',
        permission: 'manage',
      },
      {
        key: 'Administrate projects',
        title: 'Administrate projects',
        description: 'Allows a user to create, modify, delete and share all PROCEED projects.',
        permission: 'admin',
      },
    ],
  },
  {
    key: 'templates',
    title: 'TEMPLATES',
    resource: 'Template',
    permissions: [
      {
        key: 'View templates',
        title: 'View templates',
        description: 'A,llows a user to view her or his templates. (Enables the Templates view.)',
        permission: 'view',
      },

      {
        key: 'Manage templates',
        title: 'Manage templates',
        description: 'A,llows a user to create, modify and delete templates in the Templates view.',
        permission: 'manage',
      },
      {
        key: 'Administrate templates',
        title: 'Administrate templates',
        description: 'A,llows a user to create, modify, delete and share all PROCEED templates.',
        permission: 'admin',
      },
    ],
  },
  {
    key: 'tasks',
    title: 'TASKS',
    resource: 'Task',
    permissions: [
      {
        key: 'View tasks',
        title: 'View tasks',
        description: 'A,llows a user to view her or his tasks. (Enables the Tasklist view.)',
        permission: 'view',
      },
    ],
  },
  {
    key: 'machines',
    title: 'MACHINES',
    resource: 'Machine',
    permissions: [
      {
        key: 'View machines',
        title: 'View machines',
        description: 'Allows a user to view all machines. (Enables the Machines view.)',
        permission: 'view',
      },

      {
        key: 'Manage machines',
        title: 'Manage machines',
        description: 'Allows a user to create, modify and delete machines in the Machines view.',
        permission: 'manage',
      },
    ],
  },
  {
    key: 'executions',
    title: 'EXECUTIONS',
    resource: 'Execution',
    permissions: [
      {
        key: 'View executions',
        title: 'View executions',
        description: 'Allows a user to view all executions. (Enables the Executions view.)',
        permission: 'view',
      },
    ],
  },
  {
    key: 'roles',
    title: 'ROLES',
    resource: 'Role',
    permissions: [
      {
        key: 'Manage roles',
        title: 'Manage roles',
        description: 'Allows a user to create, modify and delete roles. (Enables the IAM view.)',
        permission: 'manage',
      },
    ],
  },
  {
    key: 'users',
    title: 'Users',
    resource: 'User',
    permissions: [
      {
        key: 'Manage users',
        title: 'Manage users',
        description:
          'Allows a user to create,, delete and enable/disable users. (Enables the IAM view.)',
        permission: 'manage',
      },

      {
        key: 'Manage roles of users',
        title: 'Manage roles of users',
        description:
          'Allows a user to assign roles to a user and to remove roles from a user. (Enables the IAM view.)',
        permission: 'manage',
      },
    ],
  },
  {
    key: 'settings',
    title: 'SETTINGS',
    resource: 'Setting',
    permissions: [
      {
        key: 'Administrate settings',
        title: 'Administrate settings',
        description:
          'Allows a user to administrate the settings of the Management System and the Engine. (Enables the Settings view.)',
        permission: 'admin',
      },
    ],
  },
  {
    key: 'environment_configurations',
    title: 'Environment Configurations',
    resource: 'EnvConfig',
    permissions: [
      {
        key: 'Administrate environment configuration',
        title: 'Administrate environment configuration',
        description:
          'Allows a user to administrate the environment configuration of the Management System. (Enables the Environment Configuration view.)',
        permission: 'admin',
      },
    ],
  },
  {
    key: 'all',
    title: 'ALL',
    resource: 'All',
    permissions: [
      {
        key: 'Administrator Permissions',
        title: 'Administrator Permissions',
        description:
          'Grants a user full administrator permissions for the PROCEED Management System.',
        permission: 'admin',
      },
    ],
  },
];

const RolePermissions: FC<{ role: Role }> = ({ role }) => {
  const ability = useAbilityStore((store) => store.ability);
  const environment = useEnvironment();

  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [permissions, setPermissions] = useState(role.permissions);
  const [loading, setLoading] = useState(false);

  async function updateRole() {
    setLoading(true);
    try {
      const result = await serverUpdateRole(environment.spaceId, role.id, {
        permissions,
      });
      if (result && 'error' in result) {
        throw new Error(undefined, { cause: result.error.type });
      }

      message.open({ content: 'Role updated', type: 'success' });
    } catch (e) {
      if (e instanceof Error && e.cause === UserErrorType.PermissionError)
        message.open({ content: 'Permission denied', type: 'error' });
      else message.open({ content: 'Something went wrong', type: 'error' });
    }
    setLoading(false);
  }

  return (
    <Form form={form} onFinish={updateRole}>
      {basePermissionOptions.map((permissionCategory) => (
        <>
          <Typography.Title type="secondary" level={5}>
            {permissionCategory.title}
          </Typography.Title>
          {permissionCategory.permissions.map((permission, idx) => (
            <Fragment key={permissionCategory.key}>
              <Row align="top" justify="space-between" wrap={false}>
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{permission.title}</Typography.Text>
                  <Typography.Text type="secondary">{permission.description}</Typography.Text>
                </Space>
                <Form.Item name={`${permissionCategory.resource}-${permission.permission}`}>
                  <Switch
                    disabled={switchDisabled(
                      permissions,
                      permissionCategory.resource,
                      permission.permission,
                      ability,
                    )}
                    checked={switchChecked(
                      permissions,
                      permissionCategory.resource,
                      permission.permission,
                    )}
                    onChange={() =>
                      setPermissions(
                        togglePermission(
                          permissions,
                          permissionCategory.resource,
                          permission.permission,
                        ),
                      )
                    }
                  />
                </Form.Item>
              </Row>
              {idx < permissionCategory.permissions.length - 1 && (
                <Divider style={{ marginTop: '10px', marginBottom: '10px' }} />
              )}
            </Fragment>
          ))}
          <br />
        </>
      ))}

      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        icon={<SaveOutlined />}
        style={{
          position: 'sticky',
          bottom: 0,
        }}
      >
        Save
      </Button>
    </Form>
  );
};

export default RolePermissions;
