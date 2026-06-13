import Content from '@/components/content';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import DashboardView from './dashboard-view';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import {
  getDashboardProcessStats,
  getFolderTree,
  getMembershipAndManagerStatus,
  getTeamMemberIds,
} from './dashboard-data';

const Page = async (props: any) => {
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);
  const { systemAdmin, userId } = await getCurrentUser();

  if (!ability.can('view', 'Machine') || !ability.can('view', 'Execution'))
    return <UnauthorizedFallback />;

  const machinesSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.dashboard',
    ability,
  );

  if (machinesSettings.active === false) {
    return notFound();
  }

  // Role Detection
  const { membershipId, isManager: hasDirectReports } = await getMembershipAndManagerStatus(
    activeEnvironment.spaceId,
    userId,
  );

  let userRole: 'user' | 'manager' | 'admin' = 'user';
  if (systemAdmin || ability.can('admin', 'All')) {
    userRole = 'admin';
  } else if (hasDirectReports) {
    // check for manager tab visibility based on organigram
    userRole = 'manager';
  }

  // Process Stats (accessible or executable)
  const processStats = await getDashboardProcessStats(activeEnvironment.spaceId);

  // Folder tree for admin tab
  const folderTree = userRole === 'admin' ? await getFolderTree(activeEnvironment.spaceId) : null;

  // Team Members
  let teamMemberIds: string[] = [];
  try {
    teamMemberIds = await getTeamMemberIds(
      activeEnvironment.spaceId,
      userRole,
      ability,
      membershipId,
    );
  } catch (_) {}
  const teamMemberCount = teamMemberIds.length;

  return (
    <Content title="Dashboard">
      <DashboardView
        userRole={userRole}
        userId={userId}
        accessibleProcesses={processStats.accessibleProcesses}
        executableProcesses={processStats.executableProcesses}
        teamMemberCount={teamMemberCount}
        teamMemberIds={teamMemberIds}
        folderTree={folderTree}
      />
    </Content>
  );
};

export default Page;
