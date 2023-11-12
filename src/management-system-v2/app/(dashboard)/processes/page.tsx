import { FC } from 'react';
import Processes from '@/components/processes';
import Content from '@/components/content';
import { Result, Space } from 'antd';
import NotLoggedInFallback from './not-logged-in-fallback';
import Auth from '@/lib/serverAuthComponents';

const ProcessesPage: FC = () => {
  return (
    <Content title="Processes">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Processes />
      </Space>
    </Content>
  );
};

export default Auth(
  {
    action: 'view',
    resource: 'Process',
    fallback: (
      <Result status="403" title="Not allowed" subTitle="You're not allowed to view processes" />
    ),
    notLoggedIn: <NotLoggedInFallback />,
  },
  ProcessesPage,
);
