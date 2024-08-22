'use client';

import { useState } from 'react';
import {
  DeleteOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Space, Button, Table, App, Breakpoint, Grid, FloatButton, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import HeaderActions from './header-actions';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import Link from 'next/link';
import { toCaslResource } from '@/lib/ability/caslAbility';
import Bar from '@/components/bar';
import { useAbilityStore } from '@/lib/abilityStore';
import ConfirmationButton from '@/components/confirmation-button';
import { useRouter } from 'next/navigation';
import RoleSidePanel from './role-side-panel';
import { deleteRoles as serverDeleteRoles } from '@/lib/data/roles';
import { Role } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import styles from './role-page.module.scss';
import { useUserPreferences } from '@/lib/user-preferences';
import cn from 'classnames';

function getMembersRepresentation(members: Role['members']) {
  if (members.length === 0) return undefined;

  return members.map((member) => userRepresentation(member)).join(', ');
}

const numberOfRows =
  typeof window !== 'undefined' ? Math.floor((window?.innerHeight - 410) / 47) : 10;
import { spaceURL, userRepresentation } from '@/lib/utils';
import { User } from '@/lib/data/user-schema';

export type FilteredRole = ReplaceKeysWithHighlighted<Role, 'name'>;

const RolesPage = ({ roles }: { roles: (Role & { members: User[] })[] }) => {
  const { message: messageApi } = App.useApp();
  const ability = useAbilityStore((store) => store.ability);
  const router = useRouter();
  const environment = useEnvironment();

  const { setSearchQuery, filteredData: filteredRoles } = useFuzySearch({
    data: roles || [],
    keys: ['name'],
    highlightedKeys: ['name'],
    transformData: (items) => items.map((item) => ({ ...item.item })),
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<FilteredRole[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showMobileRoleSider, setShowMobileRoleSider] = useState(false);

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-role-list']();

  const breakpoint = Grid.useBreakpoint();

  const openMobileRoleSider = () => {
    setShowMobileRoleSider(true);
  };

  const lastSelectedElement =
    selectedRows.length > 0 ? selectedRows[selectedRows.length - 1] : null;

  const cannotDeleteSelected = selectedRows.some(
    (role) => !ability.can('delete', toCaslResource('Role', role)),
  );

  async function deleteRoles(roleIds: string[]) {
    try {
      const result = await serverDeleteRoles(environment.spaceId, roleIds);
      if (result && 'error' in result) throw new Error();

      setSelectedRowKeys([]);
      setSelectedRows([]);
      router.refresh();
    } catch (e) {
      messageApi.error({ content: 'Something went wrong' });
    }
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'display',
      render: (name: FilteredRole['name'], role: FilteredRole) => (
        <Link style={{ color: '#000' }} href={spaceURL(environment, `/iam/roles/${role.id}`)}>
          {name.highlighted}
        </Link>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'members',
      render: (members: FilteredRole['members']) => (
        <Tooltip title={getMembersRepresentation(members)}>{members.length}</Tooltip>
      ),
      key: 'username',
    },
    {
      dataIndex: 'id',
      key: 'tooltip',
      title: '',
      width: 100,
      render: (id: string, role: FilteredRole) => (
        <ConfirmationButton
          title="Delete Role"
          description="Are you sure you want to delete this role?"
          onConfirm={() => deleteRoles([id])}
          canCloseWhileLoading={true}
          buttonProps={{
            disabled: !ability.can('delete', toCaslResource('Role', role)),
            style: {
              opacity: selectedRowKeys.length === 0 && id === hoveredRow ? 1 : 0,
              // Otherwise the button stretches the row
              position: 'absolute',
              margin: 'auto',
              top: '0',
              bottom: '0',
            },
            icon: <DeleteOutlined />,
            type: 'text',
          }}
        />
      ),
    },
    {
      dataIndex: 'info',
      key: '',
      title: '',
      render: (): React.ReactNode => (
        <Button style={{ float: 'right' }} type="text" onClick={openMobileRoleSider}>
          <InfoCircleOutlined />
        </Button>
      ),
      responsive: (breakpoint.xl ? ['xs'] : ['xs', 'sm']) as Breakpoint[],
    },
  ];

  return (
    <>
      <div
        className={breakpoint.xs ? styles.MobileView : ''}
        style={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}
      >
        <div style={{ flex: '1' }}>
          <Bar
            leftNode={
              <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  {breakpoint.xs ? null : <HeaderActions />}

                  {selectedRowKeys.length > 0 ? (
                    <Space size={20}>
                      <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => setSelectedRowKeys([])}
                      />
                      <span>{selectedRowKeys.length} selected:</span>
                      <ConfirmationButton
                        title="Delete Roles"
                        description="Are you sure you want to delete the selected roles?"
                        onConfirm={() => deleteRoles(selectedRowKeys)}
                        buttonProps={{
                          icon: <DeleteOutlined />,
                          disabled: cannotDeleteSelected,
                          type: 'text',
                        }}
                      />
                    </Space>
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

                {/* <!-- FloatButtonGroup needs a z-index of 101
              since BPMN Logo of the viewer has an z-index of 100 --> */}
                {breakpoint.xl ? undefined : (
                  <FloatButton.Group
                    className={styles.FloatButton}
                    trigger="click"
                    type="primary"
                    style={{ marginBottom: '100px', marginRight: '10px', zIndex: '101' }}
                    icon={<PlusOutlined />}
                  >
                    <Tooltip trigger="hover" placement="left" title="Create a role">
                      {/*TODO: Add "create role" button with functionality*/}
                      <FloatButton icon={<PlusOutlined />} />
                    </Tooltip>
                  </FloatButton.Group>
                )}
              </span>
            }
            searchProps={{
              onChange: (e) => setSearchQuery(e.target.value),
              onPressEnter: (e) => setSearchQuery(e.currentTarget.value),
              placeholder: 'Search Role ...',
            }}
          />

          {iconView ? undefined : ( //IconView
            //TODO: add IconView for roles?
            //ListView
            <Table<FilteredRole>
              columns={columns}
              dataSource={filteredRoles}
              onRow={(element) => ({
                onMouseEnter: () => setHoveredRow(element.id),
                onMouseLeave: () => setHoveredRow(null),
                onDoubleClick: () => router.push(spaceURL(environment, `/iam/roles/${element.id}`)),
                onClick: () => {
                  setSelectedRowKeys([element.id]);
                  setSelectedRows([element]);
                },
              })}
              rowSelection={{
                selectedRowKeys,
                onChange: (selectedRowKeys, selectedRows) => {
                  setSelectedRowKeys(selectedRowKeys as string[]);
                  setSelectedRows(selectedRows);
                },
              }}
              rowKey="id"
              pagination={{ position: ['bottomCenter'], pageSize: numberOfRows }}
            />
          )}
        </div>
        <RoleSidePanel
          role={lastSelectedElement}
          setShowMobileRoleSider={setShowMobileRoleSider}
          showMobileRoleSider={showMobileRoleSider}
        />
      </div>
    </>
  );
};

export default RolesPage;
