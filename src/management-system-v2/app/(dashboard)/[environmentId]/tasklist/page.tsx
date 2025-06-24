import Content from '@/components/content';
import { Result, Space } from 'antd';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { notFound } from 'next/navigation';
import Tasklist from './tasklist';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getAvailableTaskListEntries } from '@/lib/engines/server-actions';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import { truthyFilter } from '@/lib/typescript-utils';
import { getUserById } from '@/lib/data/db/iam/users';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';

const TasklistPage = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const {
    ability,
    activeEnvironment: { spaceId, isOrganization },
  } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation', ability);

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

  const { userId } = await getCurrentUser();
  let userData = await getUserById(userId);

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

  if (!isOrganization && !userData.isGuest) {
    const { username, firstName, lastName } = userData;
    users[userId] = { userName: username, name: `${firstName} ${lastName}` };
  }

  userTasks = userTasks.filter((uT) => {
    if (!uT.potentialOwners?.user?.length && !uT.potentialOwners?.roles?.length) return true;

    const userCanOwn = uT.potentialOwners?.user?.some((id) => id === userId);
    const userRoleCanOwn = uT.potentialOwners?.roles?.some((id) =>
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
