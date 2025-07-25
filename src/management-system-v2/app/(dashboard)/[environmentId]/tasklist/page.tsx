import Content from '@/components/content';
import { Result, Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getAvailableTaskListEntries } from '@/lib/engines/server-actions';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';

const TasklistPage = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) {
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

  return (
    <Content title="Tasklist">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Tasklist userTasks={userTasks}></Tasklist>
      </Space>
    </Content>
  );
};

export default TasklistPage;
