import Content from '@/components/content';
import { Result, Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';
import { env } from '@/lib/env-vars';
import { getAvailableTaskListEntries } from '@/lib/engines/server-actions';

const TasklistPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const {
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  const userTasks = await getAvailableTaskListEntries(spaceId);

  if ('error' in userTasks) {
    return (
      <Content title="Tasklist">
        <Result status="404" title="Could not load task list data" />
      </Content>
    );
  }

  return (
    <Content title="Tasklist">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Tasklist userTasks={userTasks}></Tasklist>
      </Space>
    </Content>
  );
};

export default TasklistPage;
