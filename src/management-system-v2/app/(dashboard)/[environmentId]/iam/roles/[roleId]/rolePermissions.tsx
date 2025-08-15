'use client';

import { Divider, Form, Row, Space, Switch, Typography, App, Button } from 'antd';
import { ResourceActionType, ResourceType } from '@/lib/ability/caslAbility';
import { FC, Fragment, use, useState } from 'react';
import { switchChecked, switchDisabled, togglePermission } from './role-permissions-helper';
import { useAbilityStore } from '@/lib/abilityStore';
import { updateRole as serverUpdateRole } from '@/lib/data/roles';
import { Role } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import { UserErrorType } from '@/lib/user-error';
import { EnvVarsContext } from '@/components/env-vars-context';

type PermissionCategory = {
  key: string;
  title: string;
  resource: ResourceType | ResourceType[];
  permissions: {
    key: string;
    title: string;
    description: string;
    permission: ResourceActionType;
  }[];
};

const basePermissionOptions: PermissionCategory[] = [
  {
    key: 'organization',
    title: 'ORGANIZATION',
    resource: 'Environment',
    permissions: [
      {
        key: 'Update Organization Data',
        title: 'Update Organization Data',
        description: 'Allows a user to update the Organization information.',
        permission: 'update',
      },
      {
        key: 'Delete Organization',
        title: 'Delete Organization',
        description: 'Allows a user to delete the Organization.',
        permission: 'delete',
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
        title: 'View Processes',
        description: 'Allows a user to view processes. (Enables the Processes view.)',
        permission: 'view',
      },
      {
        key: 'process_manage',
        title: 'Manage Processes',
        description: 'Allows a user to create, modify and delete processes.',
        permission: 'manage',
      },
    ],
  },
  {
    key: 'folder',
    title: 'Folders',
    resource: 'Folder',
    permissions: [
      {
        key: 'folder_view',
        title: 'View Folders',
        description: 'Allows a user to view folders.',
        permission: 'view',
      },
      {
        key: 'folder_manage',
        title: 'Manage Folders',
        description: 'Allows a user to create, modify and delete folders.',
        permission: 'manage',
      },
    ],
  },
  // NOTE: Currently not implemented
  // {
  //   key: 'projects',
  //   title: 'PROJECTS',
  //   resource: 'Project',
  //   permissions: [
  //     {
  //       key: 'View projects',
  //       title: 'View projects',
  //       description: 'Allows a user to view projects. (Enables the Projects view.)',
  //       permission: 'view',
  //     },
  //     {
  //       key: 'Manage projects',
  //       title: 'Manage projects',
  //       description: 'Allows a user to create, modify and delete projects in the Projects view.',
  //       permission: 'manage',
  //     },
  //     {
  //       key: 'Administrate projects',
  //       title: 'Administrate projects',
  //       description: 'Allows a user to perform any action on projects.',
  //       permission: 'admin',
  //     },
  //   ],
  // },
  // {
  //   key: 'templates',
  //   title: 'TEMPLATES',
  //   resource: 'Template',
  //   permissions: [
  //     {
  //       key: 'View templates',
  //       title: 'View templates',
  //       description: 'A,llows a user to view her or his templates. (Enables the Templates view.)',
  //       permission: 'view',
  //     },

  //     {
  //       key: 'Manage templates',
  //       title: 'Manage templates',
  //       description: 'A,llows a user to create, modify and delete templates in the Templates view.',
  //       permission: 'manage',
  //     },
  //     {
  //       key: 'Administrate templates',
  //       title: 'Administrate templates',
  //       description: 'A,llows a user to create, modify, delete and share all PROCEED templates.',
  //       permission: 'admin',
  //     },
  //   ],
  // },
  {
    key: 'tasks',
    title: 'TASKS',
    resource: 'Task',
    permissions: [
      {
        key: 'View Tasks',
        title: 'View Tasks',
        description: 'Allows a user to view tasks.',
        permission: 'view',
      },
      // TODO: expand when we implement more advanced task management
    ],
  },
  {
    key: 'machines',
    title: 'MACHINES',
    resource: 'Machine',
    permissions: [
      {
        key: 'View Machines',
        title: 'View machines',
        description: 'Allows a user to view all machines. (Enables the Machines view.)',
        permission: 'view',
      },

      {
        key: 'Manage Machines',
        title: 'Manage Machines',
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
        key: 'View Executions',
        title: 'View Executions',
        description: 'Allows a user to view all executions. (Enables the Executions view.)',
        permission: 'view',
      },
      {
        key: 'Manage Executions',
        title: 'Manage Executions',
        description: 'Allows a user to to start, modify and delete process executions.',
        permission: 'view',
      },
    ],
  },
  // {
  //   key: 'roles',
  //   title: 'ROLES',
  //   resource: ['Role', 'RoleMapping'],
  //   permissions: [
  //     {
  //       key: 'Manage Roles',
  //       title: 'Manage Roles',
  //       description: 'Allows a user to create, modify and delete roles.',
  //       permission: 'manage',
  //     },
  //   ],
  // },
  {
    key: 'users',
    title: 'USERS',
    resource: 'User',
    permissions: [
      {
        key: 'Manage users',
        title: 'Manage Users',
        description: 'Allows a user to add or remove users from the Organization.',
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
        key: 'View Settings',
        title: 'View Settings',
        description: 'Allows a user to view the settings of the Organization.',
        permission: 'view',
      },
      {
        key: 'Update Settings',
        title: 'Update Settings',
        description: 'Allows a user to update the settings of the Organization.',
        permission: 'update',
      },
    ],
  },
];

const RolePermissions: FC<{ role: Role }> = ({ role }) => {
  const ability = useAbilityStore((store) => store.ability);
  const environment = useEnvironment();
  const envVars = use(EnvVarsContext);

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

  const options = basePermissionOptions.filter((permissionCategory) => {
    if (
      !envVars.PROCEED_PUBLIC_ENABLE_EXECUTION &&
      (permissionCategory.resource === 'Execution' ||
        permissionCategory.resource === 'Task' ||
        permissionCategory.resource === 'Machine')
    ) {
      return false;
    } else {
      return true;
    }
  });
  return (
    <Form form={form} onFinish={updateRole}>
      {options.map((permissionCategory) => (
        <Fragment key={permissionCategory.key}>
          <Typography.Title type="secondary" level={5}>
            {permissionCategory.title}
          </Typography.Title>
          {permissionCategory.permissions.map((permission, idx) => (
            <Fragment key={permission.key}>
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
        </Fragment>
      ))}

      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        style={{
          position: 'sticky',
          bottom: 0,
        }}
      >
        Update Role
      </Button>
    </Form>
  );
};

export default RolePermissions;
