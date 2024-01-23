'use client';

import { UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Space, Tooltip } from 'antd';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { FC } from 'react';

const HeaderActions: FC = () => {
  const session = useSession();
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

  return (
    <Space style={{ float: 'right', padding: '16px' }}>
      <Button type="text" onClick={() => signOut()}>
        <u>Logout</u>
      </Button>

      <Dropdown
        menu={{
          items: [
            {
              key: 'profile',
              title: 'Account Settings',
              label: <Link href="/profile">Account Settings</Link>,
            },
            {
              key: 'environments',
              title: 'My environments',
              label: <Link href="/environments">My environments</Link>,
            },
          ],
        }}
      >
        <Link href="/profile">
          <Avatar src={session.data.user.image}>
            {session.data.user.image
              ? null
              : session.data.user.firstName.slice(0, 1) + session.data.user.lastName.slice(0, 1)}
          </Avatar>
        </Link>
      </Dropdown>
    </Space>
  );
};

export default HeaderActions;
