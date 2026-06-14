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

  // Role Detection Manager/Admin tabs only apply to organization spaces
  let isAdmin = false;
  let isManager = false;
  let membershipId: string | null = null;

  if (activeEnvironment.isOrganization) {
    const { membershipId: mId, isManager: hasDirectReports } = await getMembershipAndManagerStatus(
      activeEnvironment.spaceId,
      userId,
    );
    membershipId = mId;

    // check for admin tab based on role or permission
    if (systemAdmin || ability.can('admin', 'All')) {
      isAdmin = true;
    }

    // check for manager tab visibility based on organigram
    if (hasDirectReports) {
      isManager = true;
    }
  }

  // Process Stats (accessible or executable)
  const processStats = await getDashboardProcessStats(activeEnvironment.spaceId);

  // Folder tree for admin tab
  const folderTree = isAdmin ? await getFolderTree(activeEnvironment.spaceId) : null;

  // Team Members: fetch direct reports if manager, all members if admin
  let teamMemberIds: string[] = [];
  try {
    teamMemberIds = await getTeamMemberIds(
      activeEnvironment.spaceId,
      isAdmin,
      isManager,
      ability,
      membershipId,
    );
  } catch (_) {}
  const teamMemberCount = teamMemberIds.length;

  return (
    <Content title="Dashboard">
      <DashboardView
        isAdmin={isAdmin}
        isManager={isManager}
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
