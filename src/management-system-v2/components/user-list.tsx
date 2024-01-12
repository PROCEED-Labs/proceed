'use client';

import React, { ComponentProps, FC, ReactNode, useState } from 'react';
import { Space, Avatar, Button, Table, Result } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import Bar from '@/components/bar';
import { User } from '@/lib/data/user-schema';

type _ListUser = Partial<Omit<User, 'id' | 'firstName' | 'lastName' | 'username' | 'email'>> &
  Pick<User, 'id' | 'firstName' | 'lastName' | 'username' | 'email'> & {};
export type ListUser = ReplaceKeysWithHighlighted<
  _ListUser,
  'firstName' | 'lastName' | 'username' | 'email'
>;
type Column = Exclude<ComponentProps<typeof Table<ListUser>>['columns'], undefined>;

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
    render: (username: any) => username.highlighted,
  },
  {
    title: 'Email Adress',
    dataIndex: 'email',
    key: 'email',
    render: (email: any) => email.highlighted,
  },
];

export type UserListProps = {
  users: _ListUser[];
  highlightKeys?: boolean;
  columns?:
    | Column
    | ((clearSelected: () => void, hoveredId: string | null, selectedRowKeys: string[]) => Column);
  selectedRowActions?: (ids: string[], clearSelected: () => void, users: ListUser[]) => ReactNode;
  error?: boolean;
  searchBarRightNode?: ReactNode;
  loading?: boolean;
  sidePanel?: ReactNode;
  onSelectedRows?: (users: ListUser[]) => void;
};

const UserList: FC<UserListProps> = ({
  users,
  highlightKeys = true,
  columns,
  selectedRowActions,
  error,
  searchBarRightNode,
  loading,
  sidePanel,
  onSelectedRows,
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
              <Avatar src={user.image}>
                {user.image
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
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  let tableColumns: Column = defaultColumns;
  if (typeof columns === 'function')
    tableColumns = [
      ...defaultColumns,
      ...columns(() => setSelectedRowKeys([]), hoveredRowId, selectedRowKeys),
    ];
  else if (columns) tableColumns = [...defaultColumns, ...columns];

  if (error)
    <Result
      status="error"
      title="Failed fetch to users"
      subTitle="An error ocurred while fetching users"
    />;

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', gap: '10px' }}>
      <div style={{ flexGrow: 1 }}>
        <Bar
          leftNode={
            selectedRowKeys.length ? (
              <Space size={20}>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => setSelectedRowKeys([])}
                />
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
          columns={tableColumns}
          dataSource={filteredData}
          onRow={(element) => ({
            onMouseEnter: () => setHoveredRowId(element.id),
            onMouseLeave: () => setHoveredRowId(null),
            onClick: () => {
              setSelectedRowKeys([element.id]);
              setSelectedRows([element]);
              if (onSelectedRows) onSelectedRows([element]);
            },
          })}
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedRowKeys: React.Key[], selectedObjects) => {
              setSelectedRowKeys(selectedRowKeys as string[]);
              setSelectedRows(selectedObjects);
              if (onSelectedRows) onSelectedRows(selectedObjects);
            },
          }}
          pagination={{ position: ['bottomCenter'] }}
          rowKey="id"
          loading={loading}
        />
      </div>
      {sidePanel}
    </div>
  );
};

export default UserList;
