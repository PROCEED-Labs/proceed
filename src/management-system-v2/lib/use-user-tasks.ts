import { useSession } from '@/components/auth-can';
import useEngines from '@/lib/engines/use-engines';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getAvailableTaskListEntries } from './engines/server-actions';
import { getUserRoles } from './data/roles';

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
  const { data: engines } = useEngines(space);

  const session = useSession();

  const queryFn = useCallback(async () => {
    if (engines) {
      let result = await getAvailableTaskListEntries(space.spaceId, engines);

      if ('error' in result) return [];

      if (filter?.allowedStates) {
        result = result.filter((task) => filter.allowedStates?.includes(task.state));
      }

      if (space.isOrganization && filter?.hideUnassignedTasks) {
        result = result.filter((uT) => {
          const utRoles = uT.potentialOwners?.roles || [];
          const utUsers = uT.potentialOwners?.user || [];
          return utUsers.length || utRoles.length;
        });
      }

      if (space.isOrganization && filter?.hideNonOwnableTasks) {
        const userId = session.data?.user.id;
        if (userId) {
          let userRoles = await getUserRoles(space.spaceId, userId);
          if ('error' in userRoles) userRoles = [];
          result = result.filter((uT) => {
            const utRoles = uT.potentialOwners?.roles || [];
            const utUsers = uT.potentialOwners?.user || [];
            if (!utUsers.length && !utRoles.length) return true;

            const userCanOwn = utUsers.some((id) => id === userId);
            const userRoleCanOwn = utRoles.some((id) => userRoles.some((role) => role.id === id));

            return userCanOwn || userRoleCanOwn;
          });
        } else {
          result = [];
        }
      }

      return result;
    }

    return [];
  }, [engines, space.spaceId, filter]);

  const query = useQuery({
    queryFn,
    queryKey: [
      'userTasks',
      space.spaceId,
      filter?.allowedStates?.join(','),
      filter?.hideNonOwnableTasks,
      filter?.hideUnassignedTasks,
    ],
    refetchInterval: fetchInterval,
    enabled: !disabled,
  });

  return { engines, userTasks: query.data, ...query };
}

export default useUserTasks;
