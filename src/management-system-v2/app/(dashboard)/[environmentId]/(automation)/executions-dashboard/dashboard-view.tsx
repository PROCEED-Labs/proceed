'use client';

import { useMemo, useState } from 'react';
import { Select, DatePicker, Tabs, Skeleton } from 'antd';
import { HiUser, HiUserGroup, HiShieldCheck } from 'react-icons/hi';
import type { Dayjs } from 'dayjs';
import { useEnvironment } from '@/components/auth-can';
import { getAvailableSpaceEngines } from '@/lib/data/engines';
import { getDeployedProcesses } from '@/lib/data/deployment';
import { ExtendedInstance, getInstance } from '@/lib/data/instance';
import { getUserTasks } from '@/lib/data/user-tasks';
import { isUserErrorResponse } from '@/lib/user-error';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { truthyFilter } from '@/lib/typescript-utils';
import { useQuery } from '@tanstack/react-query';
import {
  filterInstancesByDateRange,
  calculateInstanceStats,
  getEmptyStats,
  calculateUserStats,
  calculateManagerStats,
} from './dashboard-utils';
import AdminOverviewTab from './tabs/admin-overview-tab';
import ManagerOverviewTab from './tabs/manager-overview-tab';
import UserProcessesTab from './tabs/user-processes-tab';
import styles from './dashboard-tabs.module.scss';
import { getUserRoles } from '@/lib/data/roles';
import { ExtendedTaskListEntry } from '@/lib/user-task-schema';
import { DASHBOARD_COLORS as COLORS } from '@/components/dashboard-charts/dashboard-colors';

const { RangePicker } = DatePicker;

type TimeRange = 'week' | 'month' | 'year' | 'custom';

export interface FolderTreeNode {
  title: string;
  value: string;
  processIds: string[];
  children: FolderTreeNode[];
}

interface DashboardProps {
  isAdmin: boolean;
  isManager: boolean;
  isOrganization: boolean;
  userId: string;
  accessibleProcesses: number;
  executableProcesses: number;
  teamMemberCount: number;
  teamMemberIds: string[];
  folderTree: FolderTreeNode | null;
}

const DashboardView: React.FC<DashboardProps> = ({
  isAdmin,
  isManager,
  isOrganization,
  userId,
  accessibleProcesses,
  executableProcesses,
  teamMemberCount,
  teamMemberIds,
  folderTree,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [activeTab, setActiveTab] = useState<string>('user');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const space = useEnvironment();

  // fetch engines
  const { data: engines, isLoading: enginesLoading } = useQuery({
    queryFn: async () => {
      const res = await getAvailableSpaceEngines(space.spaceId);
      if (isUserErrorResponse(res)) return [];
      return res;
    },
    refetchInterval: 1000,
    queryKey: ['space', space.spaceId, 'engines'],
  });

  // fetch all instances
  const { data: deploymentData, isLoading: deploymentsLoading } = useQuery({
    queryFn: async () => {
      const deployedProcesses = await getDeployedProcesses(space.spaceId);
      if (isUserErrorResponse(deployedProcesses)) return { deployedProcesses: [], instances: [] };

      const instanceIds = new Set<string>();
      deployedProcesses.forEach((p) =>
        p.versions.forEach((v) =>
          v.deployments.forEach((d) => d.instances.forEach((i) => instanceIds.add(i.id))),
        ),
      );

      const instances = (
        await asyncMap([...instanceIds], async (id) => {
          const instance = await getInstance(space.spaceId, id);
          if (isUserErrorResponse(instance)) return undefined;
          return instance;
        })
      ).filter(truthyFilter);

      return { deployedProcesses: deployedProcesses.map((p) => p.id), instances };
    },
    refetchInterval: 1000,
    queryKey: ['space', space.spaceId, 'deployments'],
  });

  // fetch user roles for group task matching
  const { data: myRoleIds } = useQuery({
    queryFn: async () => {
      const roles = await getUserRoles(space.spaceId, userId);
      if (isUserErrorResponse(roles)) return [];
      return roles.map((r) => r.id);
    },
    queryKey: ['user-roles', space.spaceId, userId],
  });

  const { data: userTasksData } = useQuery({
    queryFn: async () => {
      const tasks = await getUserTasks(space.spaceId);
      if (isUserErrorResponse(tasks))
        return {
          directTasks: [],
          groupTasks: [],
          unassignedTasks: [],
        };

      // personal space
      if (!isOrganization) {
        return {
          directTasks: tasks,
          groupTasks: [],
          unassignedTasks: [],
        };
      }

      // for organization space split into direct, group, unassigned
      const roleIds = myRoleIds || [];

      const directTasks = tasks.filter((t) => {
        const potentialUsers = t.potentialOwners?.user || [];
        return potentialUsers.includes(userId);
      });

      const groupTasks = tasks.filter((t) => {
        const potentialUsers = t.potentialOwners?.user || [];
        const potentialRoles = t.potentialOwners?.roles || [];
        if (potentialUsers.includes(userId)) return false;
        return potentialRoles.some((roleId) => roleIds.includes(roleId));
      });

      const unassignedTasks = tasks.filter((t) => {
        const potentialUsers = t.potentialOwners?.user || [];
        const potentialRoles = t.potentialOwners?.roles || [];
        return potentialUsers.length === 0 && potentialRoles.length === 0;
      });

      return { directTasks, groupTasks, unassignedTasks };
    },
    refetchInterval: 5000,
    queryKey: ['space', space.spaceId, 'userTasks', userId, myRoleIds, isOrganization],
  });

  const isLoading = enginesLoading || deploymentsLoading;

  // calculate date range
  const dateRange = useMemo(() => {
    if (timeRange === 'custom' && customDateRange?.[0] && customDateRange?.[1]) {
      return {
        start: customDateRange[0].startOf('day').toDate(),
        end: customDateRange[1].endOf('day').toDate(),
      };
    }

    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { start, end };
  }, [timeRange, customDateRange]);

  // filter tasks by date range
  const filteredUserTasks = useMemo(() => {
    if (!userTasksData)
      return {
        yourOpenTasks: 0,
        yourCompletedTasks: 0,
        groupOpenTasks: 0,
        groupCompletedTasks: 0,
        unassignedTasks: 0,
      };

    const filterByDate = (tasks: ExtendedTaskListEntry[]) =>
      tasks.filter((t) => {
        if (!t.startTime) return true;
        const taskDate = t.startTime instanceof Date ? t.startTime : new Date(t.startTime);
        return taskDate >= dateRange.start && taskDate <= dateRange.end;
      });

    const directFiltered = filterByDate(userTasksData.directTasks || []);
    const groupFiltered = filterByDate(userTasksData.groupTasks || []);
    const unassignedFiltered = filterByDate(userTasksData.unassignedTasks || []);

    const isOpenState = (state: string) => state !== 'COMPLETED' && state !== 'STOPPED';

    return {
      yourOpenTasks: directFiltered.filter((t) => isOpenState(t.state)).length,
      yourCompletedTasks: directFiltered.filter((t) => t.state === 'COMPLETED').length,
      groupOpenTasks: groupFiltered.filter((t) => isOpenState(t.state)).length,
      groupCompletedTasks: groupFiltered.filter((t) => t.state === 'COMPLETED').length,
      unassignedTasks: unassignedFiltered.filter((t) => isOpenState(t.state)).length,
    };
  }, [userTasksData, dateRange]);

  // filter all instances by date range
  const filteredInstances = useMemo(() => {
    if (!deploymentData?.instances?.length) return [];
    return filterInstancesByDateRange(deploymentData.instances, dateRange.start, dateRange.end);
  }, [deploymentData, dateRange]);

  // filter instances for current user only
  const userInstances = useMemo(() => {
    return filteredInstances.filter((instance) => instance.initiatorId === userId);
  }, [filteredInstances, userId]);

  // admin instances filtered by selected folder
  const adminInstances = useMemo(() => {
    if (!filteredInstances.length || !selectedFolderId || !folderTree) return filteredInstances;

    // helper: collect all processIds under a folder node recursively
    const getProcessIdsInTree = (node: FolderTreeNode, targetId: string): string[] | null => {
      if (node.value === targetId) {
        const collectAll = (n: FolderTreeNode): string[] => [
          ...n.processIds,
          ...n.children.flatMap(collectAll),
        ];
        return collectAll(node);
      }
      for (const child of node.children) {
        const result = getProcessIdsInTree(child, targetId);
        if (result) return result;
      }
      return null;
    };

    const allowedProcessIds = getProcessIdsInTree(folderTree, selectedFolderId);
    if (!allowedProcessIds) return filteredInstances;
    return filteredInstances.filter((instance) =>
      allowedProcessIds.includes(instance.state.processId),
    );
  }, [filteredInstances, selectedFolderId, folderTree]);

  // filter instances for manager's direct reports only
  const managerInstances = useMemo(() => {
    return filteredInstances.filter((instance) => {
      if (!instance.initiatorId) return false;
      // exclude manager's own instances (they appear in Your Processes tab)
      if (instance.initiatorId === userId) return false;
      return teamMemberIds.includes(instance.initiatorId);
    });
  }, [filteredInstances, teamMemberIds, userId]);

  // calculate all stats
  const stats = useMemo(() => {
    if (!engines || !deploymentData) return null;

    // user stats which is from their own instances only
    const userBaseStats = calculateInstanceStats(userInstances);

    const userStats = calculateUserStats(
      userBaseStats,
      accessibleProcesses,
      executableProcesses,
      filteredUserTasks.yourOpenTasks,
      filteredUserTasks.yourCompletedTasks,
      filteredUserTasks.groupOpenTasks,
      filteredUserTasks.groupCompletedTasks,
      filteredUserTasks.unassignedTasks,
      isAdmin,
      isOrganization,
    );

    // manager stats
    const managerBaseStats = calculateInstanceStats(managerInstances);

    const managerStats = calculateManagerStats(
      managerBaseStats,
      accessibleProcesses,
      executableProcesses,
      teamMemberCount,
    );

    // admin stats
    const adminBaseStats = isAdmin ? calculateInstanceStats(adminInstances) : getEmptyStats();

    const adminStats = {
      engines: engines.length,
      ...calculateManagerStats(
        adminBaseStats,
        accessibleProcesses,
        executableProcesses,
        teamMemberCount,
      ),
    };

    return {
      // base stats from all instances for distribution chart
      ...adminBaseStats,
      userStats,
      managerStats,
      adminStats,
    };
  }, [
    engines,
    deploymentData,
    filteredInstances,
    userInstances,
    managerInstances,
    adminInstances,
    filteredUserTasks,
    accessibleProcesses,
    executableProcesses,
    teamMemberCount,
    isAdmin,
    isOrganization,
  ]);

  // instance distribution uses all instances for radial chart
  const buildDistributionData = (instances: ExtendedInstance[]) => {
    const s = calculateInstanceStats(instances);

    const result = [
      { name: 'Completed', value: Math.max(s.completedInstances, 0), fill: COLORS.blue },
      { name: 'Running', value: Math.max(s.runningInstances, 0), fill: COLORS.green },
      { name: 'Paused', value: Math.max(s.pausedInstances, 0), fill: COLORS.orange },
      { name: 'Stopped', value: Math.max(s.stoppedInstances, 0), fill: COLORS.gray },
      { name: 'Failed', value: Math.max(s.failedInstances, 0), fill: COLORS.red },
    ];

    return result;
  };

  const userDistributionData = useMemo(() => buildDistributionData(userInstances), [userInstances]);
  const managerDistributionData = useMemo(
    () => buildDistributionData(managerInstances),
    [managerInstances],
  );
  const adminDistributionData = useMemo(
    () => buildDistributionData(adminInstances),
    [adminInstances],
  );

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    if (value !== 'custom') setCustomDateRange(null);
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setCustomDateRange(dates);
    if (dates?.[0] && dates?.[1]) setTimeRange('custom');
  };

  if (isLoading || !stats) return <Skeleton active />;

  const tabItems = [
    {
      key: 'user',
      label: (
        <span className={styles.tabLabel}>
          <HiUser className={styles.tabIconMargin} />
          Your Processes
        </span>
      ),
      children: (
        <UserProcessesTab
          userStats={stats.userStats}
          instanceDistributionData={userDistributionData}
          weeklyTrendData={stats.userStats.weeklyData}
        />
      ),
    },
  ];

  if (isManager) {
    tabItems.push({
      key: 'manager',
      label: (
        <span className={styles.tabLabel}>
          <HiUserGroup className={styles.tabIconMargin} />
          Manager Overview
        </span>
      ),
      children: (
        <ManagerOverviewTab
          managerStats={stats.managerStats}
          instanceDistributionData={managerDistributionData}
          weeklyTrendData={stats.managerStats.monthlyData}
        />
      ),
    });
  }

  if (isAdmin) {
    tabItems.push({
      key: 'admin',
      label: (
        <span className={styles.tabLabel}>
          <HiShieldCheck className={styles.tabIconMargin} />
          Admin Overview
        </span>
      ),
      children: (
        <AdminOverviewTab
          adminStats={stats.adminStats}
          instanceDistributionData={adminDistributionData}
          monthlyData={stats.adminStats.monthlyData}
          folderTree={folderTree}
          selectedFolderId={selectedFolderId}
          onFolderChange={setSelectedFolderId}
        />
      ),
    });
  }

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        tabBarStyle={{
          marginBottom: 24,
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: 12,
        }}
        tabBarExtraContent={
          <div className={styles.tabExtraContent}>
            {timeRange === 'custom' && (
              <RangePicker
                value={customDateRange}
                onChange={handleDateRangeChange}
                format="YYYY-MM-DD"
                placeholder={['Start Date', 'End Date']}
              />
            )}
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              className={styles.rangeSelectWidth}
              options={[
                { label: 'Last Week', value: 'week' },
                { label: 'Last Month', value: 'month' },
                { label: 'Last Year', value: 'year' },
                { label: 'Custom Range', value: 'custom' },
              ]}
            />
          </div>
        }
      />
    </div>
  );
};

export default DashboardView;
