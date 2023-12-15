import React, { useState, FC, PropsWithChildren } from 'react';
import { Button, Divider, Drawer, Menu } from 'antd';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAbilityStore } from '@/lib/abilityStore';import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

const { SubMenu, Item, ItemGroup } = Menu;

const MobileMenu: FC<PropsWithChildren> = () => {
  const router = useRouter();
  const activeSegment = usePathname().slice(1) || 'processes';
  const ability = useAbilityStore((state) => state.ability);

  return (
    <>
      <Menu theme="light" mode="inline" selectedKeys={[activeSegment]}>
        {ability.can('view', 'Process') || ability.can('view', 'Template') ? (
          <>
          {/* <ItemGroup key="processes" title="Processes"> */}
            {ability.can('view', 'Process') ? (
              <Item
                key="oricesses"
                title="Processes"
                hidden={!ability.can('view', 'Process')}
              >
                  <Link href="/processes">Process List</Link>
              </Item>
            ) : null}

            {ability.can('view', 'Template') ? (
              <Item key="template">
                Templates
              </Item>
            ) : null}
          {/* </ItemGroup> */}
            {/* <Divider style={{margin: "0px"}}/> */}
          </>
        ) : null}

        {ability.can('manage', 'User') ||
        ability.can('manage', 'RoleMapping') ||
        ability.can('manage', 'Role') ? (
          <>
            {/* <ItemGroup key="IAM" title="IAM"> */}
              <Item
                key="iam/users"
                hidden={!ability.can('manage', 'User')}
              >
                <Link href="/iam/users">Users</Link>
              </Item>

              <Item
                key="iam/roles"
                hidden={
                  !(ability.can('manage', 'RoleMapping') || ability.can('manage', 'Role'))
                }
              >
                <Link href="/iam/roles">Roles</Link>
              </Item>
            {/* </ItemGroup> */}
            {/* <Divider style={{margin: "0px"}}/> */}
          </>
        ) : null}

        {/* <ItemGroup key="settings" title="Settings"> */}
          {ability.can('view', 'Setting') ? (
            <Item key="generalSettings">
              <Link href="/general-settings">General Settings</Link>
            </Item>
          ) : null}
          <Item key="plugins">
            Plugins
          </Item>
          <Item onClick={() => signOut()}>
            Logout
          </Item>
        {/* </ItemGroup> */}
      </Menu>
    </>
  );
};

export default MobileMenu;
