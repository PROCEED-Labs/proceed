'use client';

import { Form, App, Button, Flex } from 'antd';
import { ResourceActionType, ResourceType } from '@/lib/ability/caslAbility';
import { FC, use, useMemo, useState } from 'react';
import {
  ResourcePermissionInputs,
  formDataToPermissions,
  permissionsToFormData,
} from './role-permissions-helper';
import { updateRole as serverUpdateRole } from '@/lib/data/roles';
import { Role } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import { UserErrorType } from '@/lib/user-error';
import { EnvVarsContext } from '@/components/env-vars-context';
import { useRouter } from 'next/navigation';

type PermissionCategory = {
  key: string;
  title: string;
  resource: ResourceType;
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
    key: 'machine_config',
    title: 'Machine Config',
    resource: 'MachineConfig',
    permissions: [
      {
        key: 'machine_config_view',
        title: 'View Machine Configurations',
        description: 'Allows a user to view machine configurations',
        permission: 'view',
      },
      {
        key: 'machine_config_manage',
        title: 'Manage Machine Configurations',
        description: 'Allows a user to create, modify and delete machine configurations',
        permission: 'manage',
      },
      {
        key: 'machine_config_admin',
        title: 'Administrate Machine Configurations',
        description: 'Allows a user perform any action on Machine Configurations.',
        permission: 'admin',
      },
    ],
  },
  {
    key: 'machine_config_release',
    title: 'Machine Config Relases',
    resource: 'MachineConfigRelease',
    permissions: [
      {
        key: 'machine_config_release_view',
        title: 'View Machine Configuration Releases',
        description: 'Allows a user to view machine configuration releases.',
        permission: 'view',
      },
      {
        key: 'machine_config_release_manage',
        title: 'Manage Machine Configuration Releases',
        description: 'Allows a user to create, modify and delete machine configuration releases.',
        permission: 'manage',
      },
      {
        key: 'machine_config_release_admin',
        title: 'Administrate Machine Configuration Releases',
        description: 'Allows a user to perform any action on Machine Configuration Releases.',
        permission: 'admin',
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
  const environment = useEnvironment();
  const envVars = use(EnvVarsContext);

  const router = useRouter();

  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);

  async function updateRole() {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const permissions = formDataToPermissions(values);

      const result = await serverUpdateRole(environment.spaceId, role.id, {
        permissions,
      });
      if (result && 'error' in result) {
        throw new Error(undefined, { cause: result.error.type });
      }

      message.open({ content: 'Role updated', type: 'success' });
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.cause === UserErrorType.PermissionError)
        message.open({ content: 'Permission denied', type: 'error' });
      else message.open({ content: 'Something went wrong', type: 'error' });
    }
    setLoading(false);
  }

  const options = useMemo(
    () =>
      basePermissionOptions.filter((permissionCategory) => {
        // disable execution permissions if execution is not activated
        return (
          envVars.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE ||
          (permissionCategory.resource !== 'Task' && permissionCategory.resource !== 'Machine')
        );
      }),
    [envVars],
  );

  // map the permissions of the role to the datastructure we need to initialize the form
  const formData = useMemo(
    () => permissionsToFormData(options, role.permissions),
    [options, role.permissions],
  );

  return (
    <Form form={form} onFinish={updateRole} initialValues={formData}>
      <ResourcePermissionInputs options={options} permissions={role.permissions} />

      <Flex
        style={{
          position: 'sticky',
          bottom: 0,
        }}
        justify="end"
        gap={5}
      >
        <Button onClick={() => form.resetFields()}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save
        </Button>
      </Flex>
    </Form>
  );
};

export default RolePermissions;
