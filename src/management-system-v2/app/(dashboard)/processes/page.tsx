import Processes from '@/components/processes';
import Content from '@/components/content';
import { Result, Space } from 'antd';
import NotLoggedInFallback from './not-logged-in-fallback';
import { getProcesses } from '@/lib/data/legacy/process';
import Auth, { getCurrentUser } from '@/components/auth';

const ProcessesPage = async () => {
  const { ability } = await getCurrentUser();
  const processes = await getProcesses(ability);
  //await new Promise((resolve) => setTimeout(resolve, 10000));

  return (
    <Content title="Processes">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Processes processes={processes} />
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
