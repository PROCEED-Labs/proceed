'use client';
import { FC } from 'react';
import Processes from '@/components/processes';
import Content from '@/components/content';
import Space from '@/components/_space';
import HeaderActions from './header-actions';
import { AuthCan, login, useAuthStore } from '@/lib/iam';
import { Button, Result } from 'antd';
import { LoginOutlined } from '@ant-design/icons';

const ProcessesPage: FC = () => {
  const loggedIn = useAuthStore((state) => state.loggedIn);
  if (!loggedIn)
    <Result
      status="403"
      title="You're not logged in"
      extra={
        <Button type="primary" icon={<LoginOutlined />} onClick={login}>
          Login
        </Button>
      }
    />;

  return (
    <AuthCan
      action="view"
      resource="Process"
      fallback={<Result status="403" title="You're not allowed to view processes" />}
    >
      <Content title="Processes" rightNode={<HeaderActions />}>
        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
          <Processes />
        </Space>
      </Content>
    </AuthCan>
  );
};

export default ProcessesPage;
