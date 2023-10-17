'use client';

import React, { ComponentProps, FC, ReactNode, useMemo, useState } from 'react';
import { Space, Avatar, Button, Table, Result } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import useFuzySearch from '@/lib/useFuzySearch';
import Bar from '@/components/bar';
import { ApiData } from '@/lib/fetch-data';

const defaultColumns = [
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
];

type User = ApiData<'/users', 'get'>[number];
type ListUser = Partial<Omit<User, 'id' | 'firstName' | 'lastName' | 'username' | 'email'>> &
  Pick<User, 'id' | 'firstName' | 'lastName' | 'username' | 'email'> & {};
type Column = Exclude<ComponentProps<typeof Table<ListUser>>['columns'], undefined>;

export type UserListProps = {
  users: ListUser[];
  columns?: Column | ((clearSelected: () => void) => Column);
  selectedRowActions?: (ids: string[], clearSelected: () => void, users: ListUser[]) => ReactNode;
  error?: boolean;
  searchBarRightNode?: ReactNode;
  loading?: boolean;
};

const UserList: FC<UserListProps> = ({
  users,
  columns,
  selectedRowActions,
  error,
  searchBarRightNode,
  loading,
}) => {
  const { searchQuery, setSearchQuery, filteredData } = useFuzySearch(
    users,
    ['firstName', 'lastName', 'username', 'email'],
    { useSearchParams: false },
  );

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<typeof users>([]);

  const tableColums = useMemo(() => {
    if (!columns) return defaultColumns;

    if (typeof columns === 'function')
      return [...defaultColumns, ...columns(() => setSelectedRowKeys([]))];
    else return [...defaultColumns, ...columns];
  }, [columns]);

  if (error)
    <Result
      status="error"
      title="Failed fetch to users"
      subTitle="An error ocurred while fetching users"
    />;

  return (
    <>
      <Bar
        leftNode={
          selectedRowKeys.length ? (
            <Space size={20}>
              <Button type="text" icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])} />
              <span>{selectedRowKeys.length} selected: </span>
              {selectedRowActions
                ? selectedRowActions(selectedRowKeys, () => setSelectedRowKeys([]), selectedRows)
                : null}
            </Space>
          ) : undefined
        }
        searchProps={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: 'Search Users ...',
        }}
        rightNode={searchBarRightNode ? searchBarRightNode : null}
      />
      <Table
        columns={tableColums}
        dataSource={filteredData.map((user) => ({
          ...user,
          display: (
            <Space size={16}>
              <Avatar src={user.picture}>
                {user.picture ? null : user.firstName.slice(0, 1) + user.lastName.slice(0, 1)}
              </Avatar>
              <span>
                {user.firstName} {user.lastName}
              </span>
            </Space>
          ),
        }))}
        rowSelection={{
          selectedRowKeys,
          onChange: (selectedRowKeys: React.Key[], selectedObjects: typeof users) => {
            setSelectedRowKeys(selectedRowKeys as string[]);
            setSelectedRows(selectedObjects);
          },
        }}
        rowKey="id"
        loading={loading}
        size="middle"
      />
    </>
  );
};

export default UserList;
