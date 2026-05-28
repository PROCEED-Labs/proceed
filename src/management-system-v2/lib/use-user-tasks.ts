import { useSession } from '@/components/auth-can';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getUserRoles } from './data/roles';
import { isUserErrorResponse } from './user-error';
import { getUserTasks } from './data/user-tasks';

function useUserTasks(
  space: { spaceId: string; isOrganization: boolean },
  fetchInterval = 1000,
  filter?: {
    allowedStates?: string[];
    hideUnassignedTasks?: boolean;
    hideNonOwnableTasks?: boolean;
  },
  disabled?: boolean,
) {
  const session = useSession();

  const queryFn = useCallback(async () => {
    let result = await getUserTasks(space.spaceId);

    if (isUserErrorResponse(result)) return [];

    return result;
  }, [space.spaceId]);

  const query = useQuery({
    queryFn,
    queryKey: ['userTasks', space.spaceId],
    refetchInterval: fetchInterval,
    enabled: !disabled,
  });

  let userTasks = query.data || [];

  if (filter?.allowedStates) {
    userTasks = userTasks.filter((task) => filter.allowedStates?.includes(task.state));
  }

  if (space.isOrganization && filter?.hideUnassignedTasks) {
    userTasks = userTasks.filter((uT) => {
      const utRoles = uT.potentialOwners?.roles || [];
      const utUsers = uT.potentialOwners?.user || [];
      return utUsers.length || utRoles.length;
    });
  }

  const { data: userRoles } = useQuery({
    queryFn: async () => {
      let roles;
      if (session.data?.user.id) roles = await getUserRoles(space.spaceId, session.data.user.id);

      if (!roles || 'error' in roles) return [];

      return roles;
    },
    initialData: [],
    queryKey: ['user-roles', space.spaceId, session.data?.user.id],
  });

  if (space.isOrganization && filter?.hideNonOwnableTasks) {
    const userId = session.data?.user.id;
    if (userId) {
      userTasks = userTasks.filter((uT) => {
        const utRoles = uT.potentialOwners?.roles || [];
        const utUsers = uT.potentialOwners?.user || [];
        if (!utUsers.length && !utRoles.length) return true;

        const userCanOwn = utUsers.some((id) => id === userId);
        const userRoleCanOwn = utRoles.some((id) => userRoles.some((role) => role.id === id));

        return userCanOwn || userRoleCanOwn;
      });
    } else {
      userTasks = [];
    }
  }

  return { userTasks };
}

export default useUserTasks;
