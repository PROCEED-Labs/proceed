'use client';

import React, { FC, useState } from 'react';
import styles from '@/components/processes.module.scss';
import cn from 'classnames';
import { DeleteOutlined } from '@ant-design/icons';
import { Tooltip, Space, Row, Col, Button, Input, Result, Table, Popconfirm, App } from 'antd';
import { useGetAsset, useDeleteAsset, ApiData } from '@/lib/fetch-data';
import { CloseOutlined } from '@ant-design/icons';
import Auth from '@/lib/AuthCanWrapper';
import Content from '@/components/content';
import HeaderActions from './header-actions';
import useFuzySearch from '@/lib/useFuzySearch';
import { AuthCan } from '@/lib/iamComponents';
import Link from 'next/link';
import { toCaslResource } from '@/lib/ability/caslAbility';
import Bar from '@/components/bar';
import { useAuthStore } from '@/lib/iam';

type Role = ApiData<'/roles', 'get'>[number];

const RolesPage: FC = () => {
  const { message: messageApi } = App.useApp();
  const ability = useAuthStore((store) => store.ability);
  const { error, data: roles, isLoading, refetch: refetchRoles } = useGetAsset('/roles', {});
  const { mutateAsync: deleteRole, isLoading: deletingRole } = useDeleteAsset('/roles/{id}', {
    onSuccess: () => refetchRoles(),
    onError: () => messageApi.open({ type: 'error', content: 'Something went wrong' }),
  });

  const {
    searchQuery,
    setSearchQuery,
    filteredData: filteredRoles,
  } = useFuzySearch(roles || [], ['name'], {
    useSearchParams: false,
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRow, setSelectedRows] = useState<Role[]>([]);

  const canDeleteSelected = !selectedRow.some(
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
      render: (name: string, role: Role) => <Link href={`/iam/roles/${role.id}`}>{name}</Link>,
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
      with: 100,
      render: (id: string, role: Role) =>
        selectedRowKeys.length === 0 ? (
          <AuthCan action="delete" resource={toCaslResource('Role', role)}>
            <Tooltip placement="top" title={'Delete'}>
              <Popconfirm
                title="Delete User"
                description="Are you sure you want to delete this user?"
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
              <span>
                {selectedRowKeys.length} selected {canDeleteSelected ? ':' : ' '}
              </span>
              {canDeleteSelected && (
                <Popconfirm
                  title="Delete User"
                  description="Are you sure you want to delete this user?"
                  onConfirm={() => deleteRoles(selectedRowKeys)}
                >
                  <Button type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
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

export default Auth(
  {
    action: 'manage',
    resource: 'User',
    fallbackRedirect: '/',
  },
  RolesPage,
);
