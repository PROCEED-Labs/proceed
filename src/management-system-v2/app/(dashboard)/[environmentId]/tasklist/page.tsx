import Content from '@/components/content';
import { Result, Space } from 'antd';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';
import { env } from '@/lib/env-vars';
import { getAvailableTaskListEntries } from '@/lib/engines/server-actions';
import { getRoles } from '@/lib/data/DTOs';

const TasklistPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const {
    ability,
    activeEnvironment: { spaceId, isOrganization },
  } = await getCurrentEnvironment(params.environmentId);

  let userTasks = await getAvailableTaskListEntries(spaceId);

  if ('error' in userTasks) {
    return (
      <Content title="Tasklist">
        <Result status="404" title="Could not load task list data" />
      </Content>
    );
  }

  const { userId } = await getCurrentUser();

  const roles = isOrganization ? await getRoles(spaceId, ability) : [];
  const userRoles = roles.filter((role) => {
    return (
      role.environmentId === params.environmentId &&
      role.members.some((member) => member.userId === userId)
    );
  });

  userTasks = userTasks.filter((uT) => {
    if (!uT.performers.user?.length && !uT.performers.roles?.length) return true;

    const userCanOwn = uT.performers.user?.some((id) => id === userId);
    const userRoleCanOwn = uT.performers.roles?.some((id) =>
      userRoles.some((role) => role.id === id),
    );

    return userCanOwn || userRoleCanOwn;
  });

  return (
    <Content title="Tasklist">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Tasklist userId={userId} userTasks={userTasks}></Tasklist>
      </Space>
    </Content>
  );
};

export default TasklistPage;
