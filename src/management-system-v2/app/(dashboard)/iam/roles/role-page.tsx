'use client';

import { FC, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Tooltip, Space, Button, Result, Table, Popconfirm, App } from 'antd';
import { useGetAsset, useDeleteAsset, ApiData } from '@/lib/fetch-data';
import { CloseOutlined } from '@ant-design/icons';
import Content from '@/components/content';
import HeaderActions from './header-actions';
import useFuzySearch from '@/lib/useFuzySearch';
import Link from 'next/link';
import { toCaslResource } from '@/lib/ability/caslAbility';
import Bar from '@/components/bar';
import { AuthCan } from '@/lib/clientAuthComponents';
import { useAbilityStore } from '@/lib/abilityStore';

type Role = ApiData<'/roles', 'get'>[number];

const RolesPage: FC = () => {
  const { message: messageApi } = App.useApp();
  const ability = useAbilityStore((store) => store.ability);
  const { error, data: roles, isLoading, refetch: refetchRoles } = useGetAsset('/roles', {});
  const { mutateAsync: deleteRole, isLoading: deletingRole } = useDeleteAsset('/roles/{id}', {
    onSuccess: () => refetchRoles(),
    onError: () => messageApi.open({ type: 'error', content: 'Something went wrong' }),
  });

  const { setSearchQuery, filteredData: filteredRoles } = useFuzySearch({
    data: roles || [],
    keys: ['name'],
    highlightedKeys: ['name'],
    transformData: (items) => items.map((item) => item.item),
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRow, setSelectedRows] = useState<Role[]>([]);

  const cannotDeleteSelected = selectedRow.some(
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
      render: (name: string, role: Role) => (
        <Link style={{ color: '#000' }} href={`/iam/roles/${role.id}`}>
          {name}
        </Link>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'members',
      render: (_: any, record: Role) => record.members.length,
      key: 'username',
    },
    {
      dataIndex: 'id',
      key: 'tooltip',
      title: '',
      width: 100,
      render: (id: string, role: Role) =>
        selectedRowKeys.length === 0 ? (
          <AuthCan action="delete" resource={toCaslResource('Role', role)}>
            <Tooltip placement="top" title={'Delete'}>
              <Popconfirm
                title="Delete Role"
                description="Are you sure you want to delete this role?"
                onConfirm={() => deleteRoles([id])}
              >
                <Button icon={<DeleteOutlined />} type="text" />
              </Popconfirm>
            </Tooltip>
          </AuthCan>
        ) : null,
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
      <Bar
        rightNode={<HeaderActions />}
        leftNode={
          selectedRowKeys.length > 0 ? (
            <Space size={20}>
              <Button type="text" icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])} />
              <span>{selectedRowKeys.length} selected:</span>
              <Popconfirm
                title="Delete Roles"
                description="Are you sure you want to delete the selected roles?"
                onConfirm={() => deleteRoles(selectedRowKeys)}
              >
                <Button type="text" icon={<DeleteOutlined />} disabled={cannotDeleteSelected} />
              </Popconfirm>
            </Space>
          ) : null
        }
        searchProps={{
          onChange: (e) => setSearchQuery(e.target.value),
          onPressEnter: (e) => setSearchQuery(e.currentTarget.value),
          placeholder: 'Search Role ...',
        }}
      />

      <Table
        columns={columns}
        dataSource={filteredRoles}
        rowSelection={{
          selectedRowKeys,
          onChange: (selectedRowKeys, selectedRows) => {
            setSelectedRowKeys(selectedRowKeys as string[]);
            setSelectedRows(selectedRows);
          },
        }}
        rowKey="id"
        loading={isLoading || deletingRole}
        size="middle"
      />
    </Content>
  );
};

export default RolesPage;
