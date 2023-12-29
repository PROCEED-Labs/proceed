'use client';

import { FC, PropsWithChildren } from 'react';
import { Divider, Menu } from 'antd';
const { SubMenu, Item, ItemGroup } = Menu;
import {
  FileOutlined,
  ProfileOutlined,
  UnlockOutlined,
  UserOutlined,
  SettingOutlined,
  ApiOutlined,
  EditOutlined,
  FileAddOutlined,
  StarOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import ProcessCreationButton from './process-creation-button';
import { useAbilityStore } from '@/lib/abilityStore';
import ProcessImportButton from './process-import';
import Link from 'next/link';

const SiderMenu: FC<PropsWithChildren> = () => {
  const router = useRouter();
  const activeSegment = usePathname().slice(1) || 'processes';
  const ability = useAbilityStore((state) => state.ability);

  return (
      <Menu theme="light" mode="inline" selectedKeys={[activeSegment]}>
        {ability.can('view', 'Process') || ability.can('view', 'Template') ? (
          <>
          <ItemGroup key="processes" title="Processes">
            {ability.can('view', 'Process') ? (
              <Item
                key="oricesses"
                title="Processes"
                icon={<FileOutlined />}
                hidden={!ability.can('view', 'Process')}
              >
                <Link href="/processes">Process List</Link>
              </Item>
            ) : null}

            {ability.can('view', 'Template') ? (
              <Item key="template" icon={<ProfileOutlined />}>
                Templates
              </Item>
            ) : null}
          </ItemGroup>
            <Divider style={{margin: "0px"}}/>
          </>
        ) : null}

        {ability.can('manage', 'User') ||
        ability.can('manage', 'RoleMapping') ||
        ability.can('manage', 'Role') ? (
          <>
            <ItemGroup key="IAM" title="IAM">
              <Item
                key="iam/users"
                icon={<UserOutlined />}
                hidden={!ability.can('manage', 'User')}
              >
                <Link href="/iam/users">Users</Link>
              </Item>

              <Item
                key="iam/roles"
                icon={<UnlockOutlined />}
                hidden={
                  !(ability.can('manage', 'RoleMapping') || ability.can('manage', 'Role'))
                }
              >
                <Link href="/iam/roles">Roles</Link>
              </Item>
            </ItemGroup>
            <Divider style={{margin: "0px"}}/>
          </>
        ) : null}

        <ItemGroup key="settings" title="Settings">
          {ability.can('view', 'Setting') ? (
            <Item key="generalSettings" icon={<SettingOutlined />}>
              <Link href="/general-settings">General Settings</Link>
            </Item>
          ) : null}
          {/* <Item key="plugins" icon={<ApiOutlined />}>
            Plugins
          </Item> */}
        </ItemGroup>
      </Menu>
  );
};

export default SiderMenu;
