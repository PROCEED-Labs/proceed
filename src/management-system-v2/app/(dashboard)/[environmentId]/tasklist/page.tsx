import Content from '@/components/content';
import { Result, Space } from 'antd';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getAvailableTaskListEntries } from '@/lib/engines/server-actions';
import { getUserRoles } from '@/lib/data/db/iam/roles';
import { truthyFilter } from '@/lib/typescript-utils';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { getUsersInSpace } from '@/lib/data/db/iam/memberships';

const TasklistPage = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) {
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
    ability,
    activeEnvironment: { spaceId, isOrganization },
  } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation');
  if (automationSettings.active === false || automationSettings.tasklist?.active === false) {
    return notFound();
  }

  let userTasks = await getAvailableTaskListEntries(spaceId);

  if ('error' in userTasks) {
    return (
      <Content title="Tasklist">
        <Result status="404" title="Could not load task list data" />
      </Content>
    );
  }

  const spaceUsers = await getUsersInSpace(spaceId, ability);
  const users = Object.fromEntries(
    spaceUsers.map((member) => [
      member.id,
      {
        userName: member.username || undefined,
        name: member.firstName + ' ' + member.lastName,
      },
    ]),
  );
  if (!isOrganization) {
    // make sure that the user is part of the list of users in personal spaces
    const { username, firstName, lastName } = userData;
    users[userId] = { userName: username, name: `${firstName} ${lastName}` };
  }

  const userRoles = await getUserRoles(userId, spaceId, ability);
  userTasks = userTasks.filter((uT) => {
    const utRoles = uT.potentialOwners?.roles || [];
    const utUsers = uT.potentialOwners?.user || [];
    if (!utUsers.length && !utRoles.length) return true;

    const userCanOwn = utUsers.some((id) => id === userId);
    const userRoleCanOwn = utRoles.some((id) => userRoles.some((role) => role.id === id));

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
