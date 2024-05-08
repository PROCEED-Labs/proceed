import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { enableNewMSExecution } from 'FeatureFlags';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';

const TasklistPage = async ({ params }: { params: { environmentId: string } }) => {
  console.log('enablenewmsexecution', enableNewMSExecution);
  if (!enableNewMSExecution) {
    return notFound();
  }

  const { ability } = await getCurrentEnvironment(params.environmentId);

  return (
    <Content title="Tasklist">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Tasklist></Tasklist>
      </Space>
    </Content>
  );
};

export default TasklistPage;
