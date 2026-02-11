'use client';

import cn from 'classnames';

import useUserTasks from '@/lib/use-user-tasks';
import { Badge } from 'antd';

type ActiveTasksBadgeProps = {
  activeSpace: { spaceId: string; isOrganization: boolean };
  onIcon?: boolean;
  pollingInterval: number;
};
const ActiveTasksBadge: React.FC<ActiveTasksBadgeProps> = ({
  activeSpace,
  onIcon,
  pollingInterval,
}) => {
  const { userTasks } = useUserTasks(activeSpace, pollingInterval, {
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
