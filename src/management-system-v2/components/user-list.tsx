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
import {
  InfoCircleOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import Bar from '@/components/bar';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import styles from './user-list.module.scss';
import { FloatButtonActions } from '@/app/(dashboard)/[environmentId]/iam/users/header-actions';
import { useUserPreferences } from '@/lib/user-preferences';
import cn from 'classnames';
import UserSiderContent from '@/app/(dashboard)/[environmentId]/iam/users/user-sider-content';

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
  error?: boolean;
  createUserNode?: ReactNode;
  loading?: boolean;
  sidePanel?: ReactNode;
  setShowMobileUserSider: Dispatch<SetStateAction<boolean>>;
  showMobileUserSider: boolean;
  onSelectedRows?: (users: ListUser[]) => void;
  selectedUser: ListUser | null;
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
  showMobileUserSider,
  selectedUser,
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
  const iconView = useUserPreferences.use['icon-view-in-user-list']();

  const addPreferences = useUserPreferences.use.addPreferences();

  const openMobileUserSider = () => {
    setShowMobileUserSider(true);
  };

  const closeMobileUserSider = () => {
    setShowMobileUserSider(false);
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
    {
      dataIndex: 'info',
      key: '',
      title: '',
      render: (): React.ReactNode => (
        <Button style={{ float: 'right' }} type="text" onClick={openMobileUserSider}>
          <InfoCircleOutlined />
        </Button>
      ),
      responsive: (breakpoint.xl ? ['xs'] : ['xs', 'sm']) as Breakpoint[],
    },
  ];

  let tableColumns: Column = defaultColumns;
  if (!breakpoint.xl) {
    tableColumns = defaultColumns;
  } else if (typeof columns === 'function')
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
    <div
      className={breakpoint.xs ? styles.MobileView : ''}
      style={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}
    >
      <div style={{ flex: '1' }}>
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
              {
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
              }
            </span>
          }
          searchProps={{
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: 'Search Users ...',
          }}
        />

        {/* <!-- FloatButtonGroup needs a z-index of 101
            since BPMN Logo of the viewer has an z-index of 100 --> */}
        {breakpoint.xl ? undefined : (
          <FloatButton.Group
            className={styles.FloatButton}
            trigger="click"
            type="primary"
            style={{ marginBottom: '60px', zIndex: '101' }}
            icon={<PlusOutlined />}
          >
            <Tooltip trigger="hover" placement="left" title="Create an user">
              <FloatButton icon={<FloatButtonActions />} />
            </Tooltip>
          </FloatButton.Group>
        )}

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
      {/*Meta Data Panel*/}
      {breakpoint.xl ? (
        sidePanel
      ) : (
        <Drawer
          onClose={closeMobileUserSider}
          title={
            <span>
              {filteredData?.find((item) => item.id === selectedRowKeys[0])?.username.value!}
            </span>
          }
          open={showMobileUserSider}
        >
          <UserSiderContent user={selectedUser} />
        </Drawer>
      )}
    </div>
  );
};

export default UserList;
