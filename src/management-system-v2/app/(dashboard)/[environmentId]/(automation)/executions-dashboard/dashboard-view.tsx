'use client';

import { useMemo, useState } from 'react';
import { Select, DatePicker, Tabs, Skeleton } from 'antd';
import { HiUser, HiUserGroup, HiShieldCheck } from 'react-icons/hi';
import type { Dayjs } from 'dayjs';
import { useEnvironment } from '@/components/auth-can';
import { getAvailableSpaceEngines } from '@/lib/data/engines';
import { getDeployedProcesses } from '@/lib/data/deployment';
import { getInstance } from '@/lib/data/instance';
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
  userId: string;
  accessibleProcesses: number;
  executableProcesses: number;
  teamMemberCount: number;
  teamMemberIds: string[];
  folderTree: FolderTreeNode | null;
}

const COLORS = {
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  gray: '#8c8c8c',
};

const DashboardView: React.FC<DashboardProps> = ({
  isAdmin,
  isManager,
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

  // fetch user tasks for current user
  const { data: userTasksData } = useQuery({
    queryFn: async () => {
      const tasks = await getUserTasks(space.spaceId);

      if (isUserErrorResponse(tasks)) return { openTasks: 0, completedTasks: 0, allTasks: [] };
      // filter tasks where current user is actual owner, or it's a potential owner match ,or is open to everyone
      const myTasks = tasks.filter((t) => {
        const isActualOwner = t.actualOwner?.some((o) => o.id === userId);
        const potentialUsers = t.potentialOwners?.user || [];
        const potentialRoles = t.potentialOwners?.roles || [];
        const isPotentialOwner = potentialUsers.includes(userId);
        const isOpenToEveryone = potentialUsers.length === 0 && potentialRoles.length === 0;
        return isActualOwner || isPotentialOwner || isOpenToEveryone;
      });
      return {
        openTasks: myTasks.filter((t) => t.state !== 'COMPLETED').length,
        completedTasks: myTasks.filter((t) => t.state === 'COMPLETED').length,
        allTasks: myTasks,
      };
    },
    refetchInterval: 5000,
    queryKey: ['space', space.spaceId, 'userTasks', userId],
  });

  const isLoading = enginesLoading || deploymentsLoading;

  // calculate date range
  const dateRange = useMemo(() => {
    if (timeRange === 'custom' && customDateRange?.[0] && customDateRange?.[1]) {
      return {
        start: customDateRange[0].toDate(),
        end: customDateRange[1].toDate(),
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
    if (!userTasksData?.allTasks) return { openTasks: 0, completedTasks: 0 };
    const filtered = userTasksData.allTasks.filter((t) => {
      if (!t.startTime) return true;
      const taskDate = t.startTime instanceof Date ? t.startTime : new Date(t.startTime);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });
    return {
      openTasks: filtered.filter((t) => t.state !== 'COMPLETED').length,
      completedTasks: filtered.filter((t) => t.state === 'COMPLETED').length,
    };
  }, [userTasksData, dateRange]);

  // filter all instances by date range
  const filteredInstances = useMemo(() => {
    if (!deploymentData?.instances?.length) return [];
    return filterInstancesByDateRange(
      deploymentData.instances as any[],
      dateRange.start,
      dateRange.end,
    );
  }, [deploymentData, dateRange]);

  // filter instances for current user only
  const userInstances = useMemo(() => {
    if (!filteredInstances.length) return [];
    return filteredInstances.filter((instance) => instance.initiatorId === userId);
  }, [filteredInstances, userId]);

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

  // admin instances filtered by selected folder
  const adminInstances = useMemo(() => {
    if (!filteredInstances.length) return [];
    if (!selectedFolderId || !folderTree) return filteredInstances;
    const allowedProcessIds = getProcessIdsInTree(folderTree, selectedFolderId);
    if (!allowedProcessIds) return filteredInstances;
    return filteredInstances.filter((instance) =>
      allowedProcessIds.includes(instance.state?.processId),
    );
  }, [filteredInstances, selectedFolderId, folderTree]);

  // filter instances for manager's direct reports only
  const managerInstances = useMemo(() => {
    if (!filteredInstances.length) return [];
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
    const userBaseStats =
      filteredInstances.length > 0
        ? calculateInstanceStats(userInstances as any[])
        : getEmptyStats();

    const userStats = calculateUserStats(
      userBaseStats,
      accessibleProcesses,
      executableProcesses,
      filteredUserTasks.openTasks,
      filteredUserTasks.completedTasks,
    );

    // manager stats
    const managerBaseStats =
      filteredInstances.length > 0
        ? calculateInstanceStats(managerInstances as any[])
        : getEmptyStats();

    const managerStats = calculateManagerStats(
      managerBaseStats,
      accessibleProcesses,
      executableProcesses,
      teamMemberCount,
    );

    // admin stats
    const adminBaseStats = isAdmin
      ? adminInstances.length > 0
        ? calculateInstanceStats(adminInstances as any[])
        : getEmptyStats()
      : getEmptyStats();

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
  ]);

  // instance distribution uses all instances for radial chart
  const buildDistributionData = (instances: any[], label: string) => {
    const s = instances.length > 0 ? calculateInstanceStats(instances as any[]) : getEmptyStats();

    const result = [
      { name: 'Completed', value: Math.max(s.completedInstances, 0), fill: COLORS.blue },
      { name: 'Running', value: Math.max(s.runningInstances, 0), fill: COLORS.green },
      { name: 'Paused', value: Math.max(s.pausedInstances, 0), fill: COLORS.orange },
      { name: 'Stopped', value: Math.max(s.stoppedInstances, 0), fill: COLORS.gray },
      { name: 'Failed', value: Math.max(s.failedInstances, 0), fill: COLORS.red },
    ];

    return result;
  };

  const userDistributionData = useMemo(
    () => buildDistributionData(userInstances, 'USER'),
    [userInstances],
  );
  const managerDistributionData = useMemo(
    () => buildDistributionData(managerInstances, 'MANAGER'),
    [managerInstances],
  );
  const adminDistributionData = useMemo(
    () => buildDistributionData(adminInstances, 'ADMIN'),
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
