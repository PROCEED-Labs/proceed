'use client';

import { UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Space, Tooltip } from 'antd';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FC } from 'react';

const HeaderActions: FC = () => {
  const router = useRouter();
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

      <Tooltip title={loggedIn ? 'Account Settings' : 'Log in'}>
        <Avatar style={{cursor: 'pointer'}} src={session.data.user.image} onClick={() => router.push('/profile')}>
          {session.data.user.image
            ? null
            : session.data.user.firstName.slice(0, 1) + session.data.user.lastName.slice(0, 1)}
        </Avatar>
      </Tooltip>
    </Space>
  );
};

export default HeaderActions;
