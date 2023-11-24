'use client';

import React, { ComponentProps, FC, ReactNode, useMemo, useState } from 'react';
import { Space, Avatar, Button, Table, Result } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import Bar from '@/components/bar';
import { ApiData } from '@/lib/fetch-data';

type User = ApiData<'/users', 'get'>[number];
type _ListUser = Partial<Omit<User, 'id' | 'firstName' | 'lastName' | 'username' | 'email'>> &
  Pick<User, 'id' | 'firstName' | 'lastName' | 'username' | 'email'> & {};
type ListUser = ReplaceKeysWithHighlighted<
  _ListUser,
  'firstName' | 'lastName' | 'username' | 'email'
>;
type Column = Exclude<ComponentProps<typeof Table<ListUser>>['columns'], undefined>;

export type UserListProps = {
  users: _ListUser[];
  highlightKeys?: boolean;
  columns?: Column | ((clearSelected: () => void) => Column);
  selectedRowActions?: (ids: string[], clearSelected: () => void, users: ListUser[]) => ReactNode;
  error?: boolean;
  searchBarRightNode?: ReactNode;
  loading?: boolean;
};

const UserList: FC<UserListProps> = ({
  users,
  highlightKeys = true,
  columns,
  selectedRowActions,
  error,
  searchBarRightNode,
  loading,
}) => {
  const { searchQuery, setSearchQuery, filteredData } = useFuzySearch({
    data: users,
    keys: ['firstName', 'lastName', 'username', 'email'],
    transformData: (matches) =>
      matches.map((item) => {
        const user = item.item;
        return {
          ...user,
          display: (
            <Space size={16}>
              <Avatar src={user.picture}>
                {user.picture
                  ? null
                  : user.firstName.value.slice(0, 1) + user.lastName.value.slice(0, 1)}
              </Avatar>
              <span>
                {highlightKeys ? (
                  <>
                    {user.firstName.highlighted} {user.lastName.highlighted}
                  </>
                ) : (
                  `${user.firstName.value} ${user.lastName.value}`
                )}
              </span>
            </Space>
          ),
        };
      }),
    highlightedKeys: ['firstName', 'lastName', 'username', 'email'],
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<ListUser[]>([]);

  const tableColums = useMemo(() => {
    const defaultColumns: Column = [
      {
        title: 'Account',
        dataIndex: 'display',
        key: 'display',
      },
      {
        title: 'Username',
        key: 'username',
        render: (_, { username: { highlighted, value } }) => (highlightKeys ? highlighted : value),
      },
      {
        title: 'Email Adress',
        key: 'email',
        render: (_, { email: { highlighted, value } }) => (highlightKeys ? highlighted : value),
      },
    ];

    if (!columns) return defaultColumns;

    if (typeof columns === 'function')
      return [...defaultColumns, ...columns(() => setSelectedRowKeys([]))];
    else return [...defaultColumns, ...columns];
  }, [columns, highlightKeys]);

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
      <Table<ListUser>
        columns={tableColums}
        dataSource={filteredData}
        rowSelection={{
          selectedRowKeys,
          onChange: (selectedRowKeys: React.Key[], selectedObjects) => {
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
