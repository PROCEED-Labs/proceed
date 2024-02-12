import Processes from '@/components/processes';
import Content from '@/components/content';
import { Result, Space } from 'antd';
import Auth, { getCurrentEnvironment } from '@/components/auth';
import { enableNewMSExecution } from 'FeatureFlags';
import { notFound } from 'next/navigation';

const ExecutionsPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!enableNewMSExecution) {
    return notFound();
  }

  const { ability } = await getCurrentEnvironment(params.environmentId);

  return (
    <Content title="Executions">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}></Space>
    </Content>
  );
};

export default ExecutionsPage;
