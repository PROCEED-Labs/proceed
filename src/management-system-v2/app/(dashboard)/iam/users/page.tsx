'use client';

import React, { FC, useMemo, useState } from 'react';
import styles from '@/components/processes.module.scss';
import cn from 'classnames';
import { DeleteOutlined } from '@ant-design/icons';
import Fuse from 'fuse.js';
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
import { ApiData, useGetAsset, useDeleteAsset } from '@/lib/fetch-data';
import { CloseOutlined } from '@ant-design/icons';
import Auth from '@/lib/AuthCanWrapper';
import Content from '@/components/content';
import HeaderActions from './header-actions';

type User = ApiData<'/users/{id}', 'get'>;

const UsersPage: FC = () => {
  const { error, data, isLoading, refetch: refetchUsers } = useGetAsset('/users', {});
  const { message: messageApi } = App.useApp();
  const { mutateAsync: deleteUser, isLoading: deletingUser } = useDeleteAsset('/users/{id}', {
    onSuccess: () => refetchUsers(),
    onError: () => messageApi.open({ type: 'error', content: 'Something went wrong' }),
  });

  const users = useMemo(() => {
    if (!data) return [];

    return data.map((user) => ({
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
  }, [data]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fuse = useMemo(
    () =>
      users &&
      new Fuse(users, {
        findAllMatches: true,
        threshold: 0.75,
        useExtendedSearch: true,
        ignoreLocation: true,
        keys: ['firstName', 'lastName', 'username', 'email'] as (keyof User)[],
      }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    if (!fuse || searchQuery === '') return users;

    const filt = fuse.search(searchQuery).map((result) => result.item);
    return filt;
  }, [fuse, searchQuery, users]);

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
        ) : null,
    },
  ];

  if (error)
    return (
      <Result
        status="error"
        title="Failed to fetch your profile"
        subTitle="An error ocurred while fetching your profile, please try again."
      />
    );

  return (
    <Content title="Identity and Access Management" rightNode={<HeaderActions />}>
      <Row className={styles.Headerrow}>
        <Col
          xs={24}
          sm={24}
          md={24}
          lg={10}
          xl={6}
          className={cn({ [styles.SelectedRow]: selectedRowKeys.length > 0 })}
          style={{
            justifyContent: 'start',
          }}
        >
          {selectedRowKeys.length > 0 ? (
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
          ) : null}
        </Col>
        <Col className={styles.Headercol} xs={22} sm={22} md={22} lg={9} xl={13}>
          <Input.Search
            size="middle"
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            placeholder="Search Users"
          />
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
        /* onRow={(record) => ({
        onMouseEnter: () => setHovered(record.id),
        onMouseOut: () => setHovered(''),
      })} */
        /* scroll={{ x: 800 }} */
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
