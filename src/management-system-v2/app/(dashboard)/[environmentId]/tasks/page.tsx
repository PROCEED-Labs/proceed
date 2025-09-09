import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import ElementList from '@/components/item-list-view';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { getAvailableTaskListEntries } from '@/lib/engines/server-actions';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { Result, Space } from 'antd';
import { notFound } from 'next/navigation';
import TaskList from './task-list';

const TasksPage = async ({ params }: { params: { environmentId: string } }) => {
  console.log('AAAAAAA');
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) {
    return notFound();
  }

  const {
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation');

  if (automationSettings.active === false || automationSettings.tasklist?.active === false) {
    return notFound();
  }

  const userTasks = await getAvailableTaskListEntries(spaceId);

  if ('error' in userTasks) {
    return (
      <Content title="Tasklist">
        <Result status="404" title="Could not load task list data" />
      </Content>
    );
  }

  const localTasks = userTasks.filter((t) => t.machineId === 'local');

  return (
    <Content title="Tasks">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <TaskList data={localTasks} />
      </Space>
    </Content>
  );
};

export default TasksPage;
