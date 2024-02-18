'use client';

import React, { ComponentProps, Dispatch, FC, ReactNode, SetStateAction, useState } from 'react';
import {
  Space,
  Avatar,
  Button,
  Table,
  Result,
  Grid,
  Drawer,
  Breakpoint,
  FloatButton,
  Tooltip,
} from 'antd';
import { CloseOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import Bar from '@/components/bar';
import { User } from '@/lib/data/user-schema';
import styles from './user-list.module.scss';
import HeaderActions from '@/app/(dashboard)/[environmentId]/iam/users/header-actions';

type _ListUser = Partial<Omit<User, 'id' | 'firstName' | 'lastName' | 'username' | 'email'>> &
  Pick<User, 'id' | 'firstName' | 'lastName' | 'username' | 'email'> & {};
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
  error?: boolean;
  createUserNode?: ReactNode;
  loading?: boolean;
  sidePanel?: ReactNode;
  setShowMobileUserSider?: Dispatch<SetStateAction<boolean>>;
  onSelectedRows?: (users: ListUser[]) => void;
};

const UserList: FC<UserListProps> = ({
  users,
  highlightKeys = true,
  columns,
  selectedRowActions,
  error,
  createUserNode,
  loading,
  sidePanel,
  onSelectedRows,
  setShowMobileUserSider,
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

  const breakpoint = Grid.useBreakpoint();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<ListUser[]>([]);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const showMobileUserSider = () => {
    setShowMobileUserSider?.(true);
  };

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

    //TODO: get rid of the column on the right side of the info button for breakpoint < xl
    {
      dataIndex: 'info',
      key: '',
      title: '',
      render: (): React.ReactNode => (
        <Button style={{ float: 'right' }} type="text" onClick={showMobileUserSider}>
          <InfoCircleOutlined />
        </Button>
      ),
      responsive: (breakpoint.xl ? ['xs'] : ['xs', 'sm']) as Breakpoint[],
    },
  ];

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
            <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
                {breakpoint.xs ? null : createUserNode ? createUserNode : null}

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
            </span>
          }
          searchProps={{
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: 'Search Users ...',
          }}
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
        {/* <!-- FloatButtonGroup needs a z-index of 101
            since BPMN Logo of the viewer has an z-index of 100 --> */}
        {breakpoint.xl ? undefined : (
          <FloatButton.Group
            className={styles.FloatButton}
            trigger="click"
            type="primary"
            style={{ marginBottom: '60px', marginRight: '10px', zIndex: '101' }}
            icon={<PlusOutlined />}
          >
            <Tooltip trigger="hover" placement="left" title="Create an user">
              <FloatButton icon={<HeaderActions />} />
            </Tooltip>
          </FloatButton.Group>
        )}
      </div>
      {sidePanel}
    </div>
  );
};

export default UserList;
