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
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const TasklistPage = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) {
    return notFound();
  }

  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { userId, user: userData } = currentUser.value;
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

  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const {
    ability,
    activeEnvironment: { spaceId, isOrganization },
  } = currentSpace.value;

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation');
  if (automationSettings.isErr()) {
    return errorResponse(automationSettings);
  }

  if (
    automationSettings.value.active === false ||
    automationSettings.value.tasklist?.active === false
  ) {
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
  if (spaceUsers.isErr()) {
    return errorResponse(spaceUsers);
  }
  const users = Object.fromEntries(
    spaceUsers.value.map((member) => [
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
  if (userRoles.isErr()) {
    return errorResponse(userRoles);
  }

  userTasks = userTasks.filter((uT) => {
    const utRoles = uT.potentialOwners?.roles || [];
    const utUsers = uT.potentialOwners?.user || [];
    if (!utUsers.length && !utRoles.length) return true;

    const userCanOwn = utUsers.some((id) => id === userId);
    const userRoleCanOwn = utRoles.some((id) => userRoles.value.some((role) => role.id === id));

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
