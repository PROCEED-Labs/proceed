'use client';

import React, { FC, useMemo, useState } from 'react';
import styles from '@/components/processes.module.scss';
import cn from 'classnames';
import { DeleteOutlined } from '@ant-design/icons';
import {
  Tooltip,
  Space,
  Avatar,
  Row,
  Col,
  Button,
  Input,
  Result,
  Table,
  Popconfirm,
  App,
} from 'antd';
import { useGetAsset, useDeleteAsset } from '@/lib/fetch-data';
import { CloseOutlined } from '@ant-design/icons';
import Auth from '@/lib/AuthCanWrapper';
import Content from '@/components/content';
import HeaderActions from './header-actions';
import useFuzySearch from '@/lib/useFuzySearch';

const UsersPage: FC = () => {
  const { error, data, isLoading, refetch: refetchUsers } = useGetAsset('/users', {});
  const { message: messageApi } = App.useApp();
  const { mutateAsync: deleteUser, isLoading: deletingUser } = useDeleteAsset('/users/{id}', {
    onSuccess: () => refetchUsers(),
    onError: () => messageApi.open({ type: 'error', content: 'Something went wrong' }),
  });

  const { searchQuery, setSearchQuery, filteredData } = useFuzySearch(
    data || [],
    ['firstName', 'lastName', 'username', 'email'],
    { useSearchParams: false },
  );

  const filteredUsers = useMemo(() => {
    return filteredData.map((user) => ({
      ...user,
      display: (
        <Space size={16}>
          <Avatar src={user.picture} />
          <span>
            {user.firstName} {user.lastName}
          </span>
        </Space>
      ),
    }));
  }, [filteredData]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  async function deleteUsers(userIds: string[]) {
    setSelectedRowKeys([]);
    await Promise.allSettled(userIds.map((id) => deleteUser({ params: { path: { id } } })));
  }

  const columns = [
    {
      title: 'Account',
      dataIndex: 'display',
      key: 'display',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email Adress',
      dataIndex: 'email',
      key: 'email',
    },
    {
      dataIndex: 'id',
      key: 'tooltip',
      title: '',
      with: 100,
      render: (id: string) =>
        selectedRowKeys.length === 0 ? (
          <Tooltip placement="top" title={'Delete'}>
            <Popconfirm
              title="Delete User"
              description="Are you sure you want to delete this user?"
              onConfirm={() => deleteUsers([id])}
            >
              <Button icon={<DeleteOutlined />} type="text" />
            </Popconfirm>
          </Tooltip>
        ) : undefined,
    },
  ];

  if (error)
    return (
      <Content title="Identity and Access Management">
        <Result
          status="error"
          title="Failed to fetch your profile"
          subTitle="An error ocurred while fetching your profile, please try again."
        />
      </Content>
    );

  return (
    <Content title="Identity and Access Management">
      <Row className={styles.Headerrow} gutter={[8, 8]} align={'middle'}>
        {selectedRowKeys.length > 0 ? (
          <Col
            xs={24}
            lg={{ flex: 'none' }}
            className={cn({ [styles.SelectedRow]: selectedRowKeys.length > 0 })}
          >
            <Space size={20}>
              <Button type="text" icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])} />
              <span>{selectedRowKeys.length} selected: </span>
              <Popconfirm
                title="Delete User"
                description="Are you sure you want to delete this user?"
                onConfirm={() => deleteUsers(selectedRowKeys)}
              >
                <Button type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </Col>
        ) : undefined}
        <Col xs={24} lg={{ flex: 'auto' }}>
          <Input.Search
            size="middle"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            placeholder="Search Users"
          />
        </Col>
        <Col xs={24} lg={{ flex: 'none' }}>
          <HeaderActions />
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowSelection={{
          selectedRowKeys,
          onChange: (selectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(selectedRowKeys as string[]);
          },
        }}
        rowKey="id"
        loading={isLoading || deletingUser}
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
  UsersPage,
);
