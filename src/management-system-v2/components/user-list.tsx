'use client';

import React, { ComponentProps, FC, ReactNode, useState } from 'react';
import { Space, Avatar, Button, Table, Grid } from 'antd';
import { UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import Bar from '@/components/bar';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import styles from './user-list.module.scss';
import { useUserPreferences } from '@/lib/user-preferences';
import cn from 'classnames';

type _ListUser = Partial<
  Omit<AuthenticatedUser, 'id' | 'firstName' | 'lastName' | 'username' | 'email'>
> &
  Pick<AuthenticatedUser, 'id' | 'firstName' | 'lastName' | 'username' | 'email'> & {};
export type ListUser = ReplaceKeysWithHighlighted<
  _ListUser,
  'firstName' | 'lastName' | 'username' | 'email'
>;
type Column = Exclude<ComponentProps<typeof Table<ListUser>>['columns'], undefined>;

export type UserListProps = {
  users: _ListUser[];
  highlightKeys?: boolean;
  columns?:
  | Column
  | ((clearSelected: () => void, hoveredId: string | null, selectedRowKeys: string[]) => Column);
  selectedRowActions?: (ids: string[], clearSelected: () => void, users: ListUser[]) => ReactNode;
  createUserNode?: ReactNode;
  loading?: boolean;
  onSelectedRows?: (users: ListUser[]) => void;
};

const UserList: FC<UserListProps> = ({
  users,
  highlightKeys = true,
  columns,
  selectedRowActions,
  createUserNode,
  loading,
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
                  : (user.firstName.value?.slice(0, 1) ?? '') +
                  (user.lastName.value?.slice(0, 1) ?? '')}
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

  const breakpoint = Grid.useBreakpoint();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<ListUser[]>([]);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const iconView = useUserPreferences.use['icon-view-in-user-list']();

  const addPreferences = useUserPreferences.use.addPreferences();

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

  let tableColumns: Column = defaultColumns;
  if (typeof columns === 'function')
    tableColumns = [
      ...defaultColumns,
      ...columns(() => setSelectedRowKeys([]), hoveredRowId, selectedRowKeys),
    ];
  else if (columns) tableColumns = [...defaultColumns, ...columns];

  return (
    <div>
      <Bar
        leftNode={
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
              {breakpoint.md ? createUserNode : null}

              {selectedRowKeys.length ? (
                <span className={styles.SelectedRow}>
                  {selectedRowKeys.length} selected:
                  {selectedRowActions
                    ? selectedRowActions(
                      selectedRowKeys,
                      () => setSelectedRowKeys([]),
                      selectedRows,
                    )
                    : null}
                </span>
              ) : undefined}
            </span>

            <span>
              <Space.Compact className={cn(breakpoint.xs ? styles.MobileToggleView : '')}>
                <Button
                  style={!iconView ? { color: '#3e93de', borderColor: '#3e93de' } : {}}
                  onClick={() => {
                    addPreferences({ 'icon-view-in-process-list': false });
                  }}
                >
                  <UnorderedListOutlined />
                </Button>
                <Button
                  style={!iconView ? {} : { color: '#3e93de', borderColor: '#3e93de' }}
                  onClick={() => {
                    addPreferences({ 'icon-view-in-process-list': true });
                  }}
                >
                  <AppstoreOutlined />
                </Button>
              </Space.Compact>
            </span>
          </span>
        }
        searchProps={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: 'Search Users ...',
        }}
      />

      {iconView ? undefined : ( //IconView
        //TODO: add IconView for User List

        //ListView
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
      )}
    </div>
  );
};

export default UserList;
