'use client';

import { useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Space, Button, Table, App } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import HeaderActions from './header-actions';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import Link from 'next/link';
import { toCaslResource } from '@/lib/ability/caslAbility';
import Bar from '@/components/bar';
import { useAbilityStore } from '@/lib/abilityStore';
import ConfirmationButton from '@/components/confirmation-button';
import { useRouter } from 'next/navigation';
import RoleSidePanel from './role-side-panel';
import { deleteRoles as serverDeleteRoles } from '@/lib/data/roles';
import { Role } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';

export type FilteredRole = ReplaceKeysWithHighlighted<Role, 'name'>;

const RolesPage = ({ roles }: { roles: Role[] }) => {
  const { message: messageApi } = App.useApp();
  const ability = useAbilityStore((store) => store.ability);
  const router = useRouter();
  const environmentId = useEnvironment();

  const { setSearchQuery, filteredData: filteredRoles } = useFuzySearch({
    data: roles || [],
    keys: ['name'],
    highlightedKeys: ['name'],
    transformData: (items) => items.map((item) => ({ ...item.item })),
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<FilteredRole[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const lastSelectedElement =
    selectedRows.length > 0 ? selectedRows[selectedRows.length - 1] : null;

  const cannotDeleteSelected = selectedRows.some(
    (role) => !ability.can('delete', toCaslResource('Role', role)),
  );

  async function deleteRoles(roleIds: string[]) {
    try {
      const result = await serverDeleteRoles(environmentId, roleIds);
      if (result && 'error' in result) throw new Error();

      setSelectedRowKeys([]);
      setSelectedRows([]);
      router.refresh();
    } catch (e) {
      messageApi.error({ content: 'Something went wrong' });
    }
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'display',
      render: (name: FilteredRole['name'], role: FilteredRole) => (
        <Link style={{ color: '#000' }} href={`/${environmentId}/iam/roles/${role.id}`}>
          {name.highlighted}
        </Link>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'members',
      render: (members: FilteredRole['members']) => members.length,
      key: 'username',
    },
    {
      dataIndex: 'id',
      key: 'tooltip',
      title: '',
      width: 100,
      render: (id: string, role: FilteredRole) => (
        <ConfirmationButton
          title="Delete Role"
          description="Are you sure you want to delete this role?"
          onConfirm={() => deleteRoles([id])}
          canCloseWhileLoading={true}
          buttonProps={{
            disabled: !ability.can('delete', toCaslResource('Role', role)),
            style: {
              opacity: selectedRowKeys.length === 0 && id === hoveredRow ? 1 : 0,
              // Otherwise the button stretches the row
              position: 'absolute',
              margin: 'auto',
              top: '0',
              bottom: '0',
            },
            icon: <DeleteOutlined />,
            type: 'text',
          }}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', gap: 20 }}>
      <div style={{ display: 'flex', height: '100%', flexDirection: 'column', flexGrow: 1 }}>
        <Bar
          rightNode={<HeaderActions />}
          leftNode={
            selectedRowKeys.length > 0 ? (
              <Space size={20}>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => setSelectedRowKeys([])}
                />
                <span>{selectedRowKeys.length} selected:</span>
                <ConfirmationButton
                  title="Delete Roles"
                  description="Are you sure you want to delete the selected roles?"
                  onConfirm={() => deleteRoles(selectedRowKeys)}
                  buttonProps={{
                    icon: <DeleteOutlined />,
                    disabled: cannotDeleteSelected,
                    type: 'text',
                  }}
                />
              </Space>
            ) : null
          }
          searchProps={{
            onChange: (e) => setSearchQuery(e.target.value),
            onPressEnter: (e) => setSearchQuery(e.currentTarget.value),
            placeholder: 'Search Role ...',
          }}
        />
        <Table<FilteredRole>
          columns={columns}
          dataSource={filteredRoles}
          onRow={(element) => ({
            onMouseEnter: () => setHoveredRow(element.id),
            onMouseLeave: () => setHoveredRow(null),
            onDoubleClick: () => router.push(`/${environmentId}/iam/roles/${element.id}`),
            onClick: () => {
              setSelectedRowKeys([element.id]);
              setSelectedRows([element]);
            },
          })}
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedRowKeys, selectedRows) => {
              setSelectedRowKeys(selectedRowKeys as string[]);
              setSelectedRows(selectedRows);
            },
          }}
          rowKey="id"
        />
      </div>
      <RoleSidePanel role={lastSelectedElement} />
    </div>
  );
};

export default RolesPage;
