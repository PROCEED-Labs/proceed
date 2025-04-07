import Content from '@/components/content';
import { Result, Space } from 'antd';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';
import { env } from '@/lib/env-vars';
import { getAvailableTaskListEntries } from '@/lib/engines/server-actions';
import { getRolesWithMembers } from '@/lib/data/DTOs';
import { truthyFilter } from '@/lib/typescript-utils';

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

  const roles = isOrganization ? await getRolesWithMembers(spaceId, ability) : [];
  const userRoles = roles.filter((role) => {
    return (
      role.environmentId === params.environmentId &&
      role.members.some((member) => member.id === userId)
    );
  });

  const users = roles.reduce(
    (acc, role) => {
      role.members.forEach((member) => {
        acc[member.id] = {
          userName: member.username,
          name: member.firstName + ' ' + member.lastName,
        };
      });

      return acc;
    },
    {} as { [key: string]: { userName?: string; name: string } },
  );

  userTasks = userTasks.filter((uT) => {
    if (!uT.performers.user?.length && !uT.performers.roles?.length) return true;

    const userCanOwn = uT.performers.user?.some((id) => id === userId);
    const userRoleCanOwn = uT.performers.roles?.some((id) =>
      userRoles.some((role) => role.id === id),
    );

    return userCanOwn || userRoleCanOwn;
  });

  const mappedUserTasks = userTasks.map((uT) => {
    return {
      ...uT,
      actualOwner: uT.actualOwner
        .map((id) => {
          if (users[id]) {
            return { id, ...users[id] };
          } else {
            return null;
          }
        })
        .filter(truthyFilter),
    };
  });

  return (
    <Content title="Tasklist">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Tasklist userId={userId} userTasks={mappedUserTasks}></Tasklist>
      </Space>
    </Content>
  );
};

export default TasklistPage;
