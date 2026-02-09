import { useSession } from '@/components/auth-can';
import useEngines from '@/lib/engines/use-engines';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  getAvailableTaskListEntries,
  completeTasklistEntry,
  setTasklistMilestoneValues,
  setTasklistEntryVariableValues,
  addOwnerToTaskListEntry,
  getTasklistEntryHTML,
  submitFile as _submitFile,
} from './engines/server-actions';
import { getUserRoles } from './data/roles';

function useUserTasks(
  space: { spaceId: string; isOrganization: boolean },
  fetchInterval = 10000,
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

      return result;
    }

    return [];
  }, [engines, space.spaceId]);

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

  function getTaskEngine(taskId: string) {
    const task = userTasks.find((t) => t.id === taskId);

    if (!task) return;

    if (task.machineId === 'ms-local') return null;

    return engines?.find((e) => e.id === task.machineId);
  }

  async function completeEntry(taskId: string, variables: Record<string, any>) {
    const machine = getTaskEngine(taskId);

    if (machine === undefined) return;

    const res = await completeTasklistEntry(taskId, variables, machine);
    return res;
  }

  async function setMilestoneValues(taskId: string, milestones: Record<string, any>) {
    const machine = getTaskEngine(taskId);

    if (machine === undefined) return;

    return await setTasklistMilestoneValues(taskId, milestones, machine);
  }

  async function setVariableValues(taskId: string, variables: Record<string, any>) {
    const machine = getTaskEngine(taskId);

    if (machine === undefined) return;

    return await setTasklistEntryVariableValues(taskId, variables, machine);
  }

  async function addOwner(taskId: string, owner: string) {
    const machine = getTaskEngine(taskId);

    if (machine === undefined)
      return { error: 'Could not find the machine the task is running on' };

    return await addOwnerToTaskListEntry(taskId, owner, machine);
  }

  async function getTaskListEntryHtml(taskId: string, fileName: string) {
    const machine = getTaskEngine(taskId);

    if (machine === undefined)
      return { error: 'Could not find the machine the task is running on' };

    return await getTasklistEntryHTML(space.spaceId, taskId, fileName, machine);
  }

  async function submitFile(taskId: string, file: File) {
    const machine = getTaskEngine(taskId);

    if (machine === undefined)
      return { error: 'Could not find the machine the task is running on' };

    const formData = new FormData();
    formData.append('file', file);

    return await _submitFile(machine, taskId, formData);
  }

  return {
    engines,
    userTasks,
    ...query,
    completeEntry,
    setMilestoneValues,
    setVariableValues,
    addOwner,
    getTaskListEntryHtml,
    submitFile,
  };
}

export default useUserTasks;
