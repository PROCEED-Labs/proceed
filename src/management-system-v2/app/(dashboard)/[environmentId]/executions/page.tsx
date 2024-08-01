import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { env } from '@/lib/env-vars';

const ExecutionsPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!env.ENABLE_EXECUTION) {
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
