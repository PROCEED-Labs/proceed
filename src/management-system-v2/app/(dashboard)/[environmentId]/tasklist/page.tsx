import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';
import { env } from '@/lib/env-vars';

const TasklistPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!env.NEXT_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const { ability } = await getCurrentEnvironment(params.environmentId);

  const generateMockDataUserTasks = () => {
    const availableStatus = ['READY', 'ACTIVE', 'COMPLETED', 'PAUSED'];
    const userTasks = [];

    for (let i = 0; i < 100; i++) {
      userTasks.push({
        id: i,
        name: `Task ${i + 1}`,
        status: availableStatus[Math.floor(Math.random() * availableStatus.length)], // pick random status value
        owner: `Test User ${i + 1}`,
        startTime: 1714999069238 + Math.floor(Math.random() * 1000 * 60 * 60),
        endTime: 1714999869238 + Math.floor(Math.random() * 1000 * 60 * 60),
        priority: Math.floor(Math.random() * 10) + 1, // random number between 1 and 10
        progress: Math.floor(Math.random() * 101), // random number between 0 and 100
      });
    }
    return userTasks;
  };

  const userTasks = generateMockDataUserTasks();

  return (
    <Content title="Tasklist">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Tasklist userTasks={userTasks}></Tasklist>
      </Space>
    </Content>
  );
};

export default TasklistPage;
