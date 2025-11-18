import Content from '@/components/content';
import { Result, Space } from 'antd';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';

const TasklistPage = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) {
    return notFound();
  }

  const { userId, user: userData } = await getCurrentUser();
  if (!userData || userData?.isGuest) {
    return (
      <Content title="Tasklist">
        <Result
          status="404"
          title="Please sign in with a user account if you want to work on user tasks."
        />
      </Content>
    );
  }

  const {
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation');
  if (automationSettings.active === false || automationSettings.tasklist?.active === false) {
    return notFound();
  }

  return (
    <Content title="Tasklist">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Tasklist userId={userId} />
      </Space>
    </Content>
  );
};

export default TasklistPage;
