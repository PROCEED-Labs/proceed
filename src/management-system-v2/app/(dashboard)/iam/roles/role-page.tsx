'use client';

import { FC, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Space, Button, Result, Table, App } from 'antd';
import { useGetAsset, useDeleteAsset, ApiData } from '@/lib/fetch-data';
import { CloseOutlined } from '@ant-design/icons';
import Content from '@/components/content';
import HeaderActions from './header-actions';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import Link from 'next/link';
import { toCaslResource } from '@/lib/ability/caslAbility';
import Bar from '@/components/bar';
import { useAbilityStore } from '@/lib/abilityStore';
import ConfirmationButton from '@/components/confirmation-button';
import { useRouter } from 'next/navigation';
import RoleSidePanel from './role-side-panel';

type Role = ApiData<'/roles', 'get'>[number];
export type FilteredRole = ReplaceKeysWithHighlighted<Role, 'name'>;

const RolesPage: FC = () => {
  const { message: messageApi } = App.useApp();
  const ability = useAbilityStore((store) => store.ability);
  const { error, data: roles, isLoading, refetch: refetchRoles } = useGetAsset('/roles', {});
  const { mutateAsync: deleteRole, isLoading: deletingRole } = useDeleteAsset('/roles/{id}', {
    onSuccess: () => refetchRoles(),
    onError: () => messageApi.open({ type: 'error', content: 'Something went wrong' }),
  });
  const router = useRouter();

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

  async function deleteRoles(userIds: string[]) {
    setSelectedRowKeys([]);
    setSelectedRows([]);
    await Promise.allSettled(userIds.map((id) => deleteRole({ params: { path: { id } } })));
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'display',
      render: (name: FilteredRole['name'], role: FilteredRole) => (
        <Link style={{ color: '#000' }} href={`/iam/roles/${role.id}`}>
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

  if (error)
    return (
      <Result
        status="error"
        title="Failed to fetch roles"
        subTitle="An error ocurred while fetching roles, please try again."
      />
    );

  return (
    <Content title="Identity and Access Management">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        <div style={{ display: 'flex', height: '100%', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <Table<FilteredRole>
              columns={columns}
              dataSource={filteredRoles}
              onRow={(element) => ({
                onMouseEnter: () => setHoveredRow(element.id),
                onMouseLeave: () => setHoveredRow(null),
                onDoubleClick: () => router.push(`/iam/roles/${element.id}`),
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
              loading={isLoading || deletingRole}
            />
          </div>
          <RoleSidePanel role={lastSelectedElement} />
        </div>
      </div>
    </Content>
  );
};

export default RolesPage;
