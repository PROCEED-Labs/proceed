'use client';

import { Form, Space, Button, Modal, Collapse, Flex } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ResourceActionType, ResourceType } from '@/lib/ability/caslAbility';
import { FC, use, useEffect, useState } from 'react';
import {
  ResourcePermissionInputs,
  formDataToPermissions,
  permissionsToFormData,
  switchChecked,
} from './role-permissions-helper';
import { addRole, handleFolderRoleChanges } from '@/lib/data/roles';
import { Role, RoleWithChildren } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import { EnvVarsContext } from '@/components/env-vars-context';
import { Folder } from '@/lib/data/folder-schema';
import { FolderTree } from '@/components/FolderTree';
import { useRouter } from 'next/navigation';
import { truthyFilter } from '@/lib/typescript-utils';

type SelectionFolder = { id: string; name: string; type: 'folder' };

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

const FolderSelection: React.FC<{
  defaultFolders: SelectionFolder[];
  onSubmit: (selected: SelectionFolder[]) => void;
  notSelectable: string[];
}> = ({ defaultFolders, onSubmit, notSelectable }) => {
  const [selectedFolders, setSelectedFolders] = useState<SelectionFolder[]>(defaultFolders);

  return (
    <>
      <Modal
        title="Choose a folder"
        open={true}
        onOk={() => onSubmit(selectedFolders)}
        onCancel={() => onSubmit([])}
        cancelText={null}
        closeIcon={null}
      >
        <Space orientation="vertical" style={{ maxWidth: '100%' }}>
          <Button
            onClick={() => {
              setSelectedFolders([]);
            }}
            type="default"
            danger
          >
            Clear Folders
          </Button>
          <FolderTree<SelectionFolder>
            newChildrenHook={({ nodes }) => nodes.filter((node) => node.element.type === 'folder')}
            onMultiSelect={(elements) => {
              setSelectedFolders(elements || []);
            }}
            selectedKeys={selectedFolders.map((f) => f.id)}
            showRootAsFolder
            notSelectableKeys={notSelectable}
          />
        </Space>
      </Modal>
    </>
  );
};

const basePermissionOptions: PermissionCategory[] = [
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
        permission: 'manage',
      },
    ],
  },
];

const groupFolders = (role: RoleWithChildren, options: PermissionCategory[], folders: Folder[]) => {
  const groups: Record<number, RoleWithChildren[]> = {};

  for (const r of role.children) {
    let groupId = 0;

    options.forEach((o) => {
      o.permissions.forEach((p) => {
        groupId += switchChecked(r.permissions, o.resource, p.permission) ? 1 : 0;
        groupId <<= 1;
      });
    });

    if (groups[groupId]) {
      groups[groupId].push(r);
    } else {
      groups[groupId] = [r];
    }
  }

  return Object.values(groups).map((group) => ({
    folders: group.map((r) => {
      const folder = folders.find((f) => r.parentId === f.id) || {
        id: r.parentId!,
        name: '',
        type: 'folder',
      };

      if ('parentId' in folder && !folder.parentId) folder.name = '< root >';

      return { ...folder, type: 'folder' as const };
    }),
    permissions: { ...group[0].permissions },
  }));
};

const FolderPermissions: FC<{ role: RoleWithChildren; folders: Folder[] }> = ({
  role,
  folders,
}) => {
  const environment = useEnvironment();
  const envVars = use(EnvVarsContext);

  const router = useRouter();

  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);

  const options = basePermissionOptions.filter((permissionCategory) => {
    return (
      envVars.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE ||
      permissionCategory.resource !== 'Execution'
    );
  });

  const [groups, setGroups] = useState(groupFolders(role, options, folders));

  useEffect(() => {
    const values: Record<string, any> = {};

    groups.forEach((group, index) => {
      values[`${index}`] = permissionsToFormData(options, group.permissions);
    });

    form.setFieldsValue(values);
  }, [groups, form]);

  const alreadySelectedFolders = groups
    .map(({ folders }) => folders)
    .flat()
    .map((f) => f.id);

  const [initialFolders, setInitialFolders] = useState<SelectionFolder[] | undefined>();
  const [groupInEditing, setGroupInEditing] = useState<number | undefined>();
  const [notSelectable, setNotSelectable] = useState<string[]>([]);

  const items = groups.map((g, index) => ({
    key: `${index}`,
    label: (
      <Flex justify="space-between">
        <div>{g.folders.map((f) => f.name || f.id).join(', ')}</div>
        <Space.Compact>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setInitialFolders(g.folders);
              setNotSelectable(
                alreadySelectedFolders.filter((id) => !g.folders.some((f) => f.id === id)),
              );
              setGroupInEditing(index);
            }}
          />
          <Button
            size="small"
            type="text"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              Modal.confirm({
                title: 'Are you sure you want to delete the permissions for these folders?',
                content:
                  'All users associated with the role will lose access rights to the specified folders',
                onOk: () => setGroups([...groups.slice(0, index), ...groups.slice(index + 1)]),
              });
              e.stopPropagation();
            }}
          />
        </Space.Compact>
      </Flex>
    ),
    children: (
      <ResourcePermissionInputs
        pathPrefix={[index]}
        options={options}
        permissions={g.permissions}
      />
    ),
    forceRender: true,
  }));

  async function updateRoles() {
    setLoading(true);

    const values = (await form.validateFields()) as Record<
      string,
      Record<ResourceType, Record<ResourceActionType, boolean>>
    >;

    const existingFolderRoles = Object.fromEntries(
      role.children.map(({ id, parentId }) => [parentId, id]),
    );

    const updates: { roleId: string; permissions: Role['permissions'] }[] = [];
    const additions: Parameters<typeof addRole>[1][] = [];

    Object.entries(values).forEach(([indexString, resource]) => {
      const index = parseInt(indexString);
      const permissions = formDataToPermissions(resource);

      groups[index].folders.forEach((folder) => {
        if (existingFolderRoles[folder.id]) {
          updates.push({ roleId: existingFolderRoles[folder.id], permissions });
        } else {
          additions.push({
            name: `${role.name}-${folder.name || folder.id}`,
            environmentId: environment.spaceId,
            permissions,
            parentRoleId: role.id,
            parentId: folder.id,
          });
        }
      });
    });

    // remove all child roles that refer to folders that are not mapped to rules anymore
    const removals = role.children
      .filter(
        (child) =>
          !groups.some((group) => group.folders.some((folder) => folder.id === child.parentId)),
      )
      .map((role) => role.id);

    await handleFolderRoleChanges(environment.spaceId, role.id, additions, updates, removals);

    router.refresh();

    setLoading(false);
  }

  return (
    <Form form={form} onFinish={updateRoles}>
      {!!items.length && <Collapse items={items} accordion />}
      <Button
        style={{ marginTop: '10px' }}
        block
        onClick={() => {
          setInitialFolders([]);
          setNotSelectable(alreadySelectedFolders);
          setGroupInEditing(undefined);
        }}
      >
        New Folder(s) Selection
      </Button>
      {!!initialFolders && (
        <FolderSelection
          notSelectable={notSelectable}
          defaultFolders={initialFolders}
          onSubmit={(selected) => {
            const addingNewGroup = groupInEditing === undefined;
            const index = addingNewGroup ? groups.length : groupInEditing;
            const newPermissions = addingNewGroup ? {} : groups[index].permissions;

            let newGroup;
            if (selected.length) {
              newGroup = { folders: selected, permissions: newPermissions };
            }

            // add a new group or update an existing group with different folders
            setGroups(
              [...groups.slice(0, index), newGroup, ...groups.slice(index + 1)].filter(
                truthyFilter,
              ),
            );

            setInitialFolders(undefined);
            setGroupInEditing(undefined);
          }}
        />
      )}

      <Flex justify="end" gap={5} style={{ marginTop: '20px', position: 'sticky', bottom: 0 }}>
        <Button
          loading={loading}
          onClick={() => {
            Modal.confirm({
              title: 'Undo Changes',
              content: 'Are you sure that you want to undo all unsaved changes?',
              onOk: () => setGroups(groupFolders(role, options, folders)),
            });
          }}
        >
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save
        </Button>
      </Flex>
    </Form>
  );
};

export default FolderPermissions;
