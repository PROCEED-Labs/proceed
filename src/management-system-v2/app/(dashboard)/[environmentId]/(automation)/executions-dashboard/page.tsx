import Content from '@/components/content';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import DashboardView from './dashboard-view';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getUserRoles } from '@/lib/data/db/iam/roles';
import { getFullMembersWithRoles } from '@/lib/data/db/iam/memberships';
import { getDashboardProcessStats, getFolderTree } from './dashboard-data';
import db from '@/lib/data/db';

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
  let userRole: 'user' | 'manager' | 'admin' = 'user';
  if (systemAdmin || ability.can('admin', 'All')) {
    userRole = 'admin';
  } else if (
    ability.can('manage', 'User') ||
    ability.can('manage', 'RoleMapping') ||
    ability.can('manage', 'Role')
  ) {
    userRole = 'manager';
  } else {
    // check if user has a team role
    const userRoles = await getUserRoles(userId, activeEnvironment.spaceId);
    const hasTeamRole = userRoles.some((r) =>
      (r.organizationRoleType as string[])?.includes('team'),
    );
    if (hasTeamRole) userRole = 'manager';
  }

  // Process Stats (accessible or executable)
  const processStats = await getDashboardProcessStats(activeEnvironment.spaceId);

  // Folder tree for admin tab
  const folderTree = userRole === 'admin' ? await getFolderTree(activeEnvironment.spaceId) : null;

  // Team Members
  let teamMemberIds: string[] = [];
  let teamMemberCount = 0;

  if (userRole === 'manager') {
    try {
      // get loggedin user's membership
      const myMembership = await db.membership.findUnique({
        where: {
          userId_environmentId: {
            userId,
            environmentId: activeEnvironment.spaceId,
          },
        },
      });

      if (myMembership) {
        // find all members who report directly to this manager
        const directReports = await db.userOrganigram.findMany({
          where: { directManagerId: myMembership.id },
          include: { member: { select: { userId: true } } },
        });
        teamMemberIds = directReports.map((r) => r.member.userId);
        teamMemberCount = teamMemberIds.length;
      }
    } catch (_) {}
  }

  if (userRole === 'admin') {
    try {
      // admin sees all members
      const allMembers = await getFullMembersWithRoles(activeEnvironment.spaceId, ability);
      teamMemberCount = allMembers.length;
      teamMemberIds = allMembers.map((m) => m.id);
    } catch (_) {}
  }

  return (
    <Content>
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
