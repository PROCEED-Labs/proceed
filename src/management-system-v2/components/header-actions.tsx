'use client';

import { login, logout, useAuthStore } from '@/lib/iam';
import { UserOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Button, Space, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { FC } from 'react';

const HeaderActions: FC = () => {
  const router = useRouter();
  const loggedIn = useAuthStore((store) => store.loggedIn);
  const user = useAuthStore((store) => store.user);

  if (!process.env.NEXT_PUBLIC_USE_AUTH) {
    return null;
  }

  if (!loggedIn) {
    return (
      <Space style={{ float: 'right' }}>
        <Button type="text" onClick={login}>
          <u>Log in</u>
        </Button>

        <Tooltip title="Log in">
          <Button shape="circle" icon={<UserOutlined />} onClick={login} />
        </Tooltip>
      </Space>
    );
  }

  return (
    <Space style={{ float: 'right' }}>
      <Button type="text" onClick={logout}>
        <u>Logout</u>
      </Button>

      <Tooltip title={loggedIn ? 'Account Settings' : 'Log in'}>
        <Avatar src={user.picture} onClick={() => router.push('/profile')} />
      </Tooltip>
    </Space>
  );
};

export default HeaderActions;
