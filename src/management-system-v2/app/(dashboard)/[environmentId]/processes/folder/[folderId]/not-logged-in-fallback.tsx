'use client';

import { Button, Result } from 'antd';
import { signIn } from 'next-auth/react';
import { LoginOutlined } from '@ant-design/icons';

const NotLoggedInFallback = () => (
  <Result
    status="403"
    title="You're not logged in"
    subTitle="Sorry, you have to be logged in to use the app"
    extra={
      <Button type="primary" icon={<LoginOutlined />} onClick={() => signIn()}>
        Login
      </Button>
    }
  />
);

export default NotLoggedInFallback;
