'use client';

import { UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Space, Tooltip } from 'antd';
import { signIn, signOut, useSession } from 'next-auth/react';
import { FC } from 'react';
import UserAvatar from './user-avatar';
import SpaceLink from './space-link';

const HeaderActions: FC = () => {
  const session = useSession();
  const isGuest = session.data?.user.guest;
  const loggedIn = session.status === 'authenticated';

  if (!process.env.NEXT_PUBLIC_USE_AUTH) {
    return null;
  }

  if (!loggedIn) {
    return (
      <Space style={{ float: 'right' }}>
        <Button type="text" onClick={() => signIn()}>
          <u>Log in</u>
        </Button>

        <Tooltip title="Log in">
          <Button shape="circle" icon={<UserOutlined />} onClick={() => signIn()} />
        </Tooltip>
      </Space>
    );
  }

  const avatarDropdownItems = [
    {
      key: 'profile',
      title: 'Account Settings',
      label: <SpaceLink href={`/profile`}>Account Settings</SpaceLink>,
    },
  ];
  if (!isGuest)
    avatarDropdownItems.push({
      key: 'environments',
      title: 'My environments',
      label: <SpaceLink href={`/environments`}>My Spaces</SpaceLink>,
    });

  return (
    <Space style={{ float: 'right', padding: '16px' }}>
      <Button type="text" onClick={() => signOut({ redirect: true, callbackUrl: '/' })}>
        <u>Logout</u>
      </Button>

      <Dropdown
        menu={{
          items: avatarDropdownItems,
        }}
      >
        <SpaceLink href={`/profile`}>
          <UserAvatar user={session.data.user} />
        </SpaceLink>
      </Dropdown>
    </Space>
  );
};

export default HeaderActions;
