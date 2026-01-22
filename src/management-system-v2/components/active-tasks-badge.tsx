'use client';

import cn from 'classnames';

import useUserTasks from '@/lib/use-user-tasks';
import { Badge } from 'antd';

type ActiveTasksBadgeProps = {
  activeSpace: { spaceId: string; isOrganization: boolean };
  onIcon?: boolean;
};
const ActiveTasksBadge: React.FC<ActiveTasksBadgeProps> = ({ activeSpace, onIcon }) => {
  const { userTasks } = useUserTasks(activeSpace, 2000, {
    allowedStates: ['READY', 'ACTIVE'],
    hideUnassignedTasks: activeSpace.isOrganization,
    hideNonOwnableTasks: true,
  });

  const offset: [number, number] = onIcon ? [-18, -18] : [5, -2];

  return (
    <Badge
      styles={{ root: { opacity: 1 } }}
      className={cn({ 'active-tasks-icon-badge': onIcon })}
      count={userTasks?.length}
      offset={offset}
    />
  );
};

export default ActiveTasksBadge;
