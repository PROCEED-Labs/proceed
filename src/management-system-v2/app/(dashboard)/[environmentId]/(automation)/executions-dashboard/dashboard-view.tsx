'use client';

import { useMemo, useState } from 'react';
import { Select, DatePicker, Tabs, Skeleton } from 'antd';
import { HiUser, HiUserGroup, HiShieldCheck } from 'react-icons/hi';
import type { Dayjs } from 'dayjs';
import { useEnvironment } from '@/components/auth-can';
import { getAvailableSpaceEngines } from '@/lib/data/engines';
import { getDeployedProcesses } from '@/lib/data/deployment';
import { getInstance } from '@/lib/data/instance';
import { isUserErrorResponse } from '@/lib/user-error';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { truthyFilter } from '@/lib/typescript-utils';
import { useQuery } from '@tanstack/react-query';
import {
  filterInstancesByDateRange,
  calculateInstanceStats,
  getDummyStats,
  calculateUserStats,
  calculateManagerStats,
} from './dashboard-utils';
import AdminOverviewTab from './tabs/admin-overview-tab';
import ManagerOverviewTab from './tabs/manager-overview-tab';
import UserProcessesTab from './tabs/user-processes-tab';

const { RangePicker } = DatePicker;

type TimeRange = 'week' | 'month' | 'year' | 'custom';

interface DashboardProps {
  userRole: 'user' | 'manager' | 'admin';
  userId: string;
}

const COLORS = {
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  gray: '#8c8c8c',
};

const DashboardView: React.FC<DashboardProps> = ({ userRole, userId }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [activeTab, setActiveTab] = useState<string>('user');

  const isManager = userRole === 'manager' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  const space = useEnvironment();

  const { data: engines, isLoading: enginesLoading } = useQuery({
    queryFn: async () => {
      const res = await getAvailableSpaceEngines(space.spaceId);
      if (isUserErrorResponse(res)) return [];
      return res;
    },
    refetchInterval: 1000,
    queryKey: ['space', space.spaceId, 'engines'],
  });

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

  const isLoading = enginesLoading || deploymentsLoading;

  // calculate date range based on selection
  const dateRange = useMemo(() => {
    if (timeRange === 'custom' && customDateRange && customDateRange[0] && customDateRange[1]) {
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

  // filter instances by date range
  const filteredInstances = useMemo(() => {
    if (!deploymentData?.instances) return [];
    return filterInstancesByDateRange(deploymentData.instances, dateRange.start, dateRange.end);
  }, [deploymentData, dateRange]);

  // calculate stats from filtered data
  const stats = useMemo(() => {
    if (!engines || !deploymentData) return null;

    const baseStats = calculateInstanceStats(filteredInstances);
    const hasRealData = baseStats.totalInstances > 0;

    const finalBaseStats = hasRealData ? baseStats : getDummyStats();

    const userStats = calculateUserStats(finalBaseStats);
    const managerStats = calculateManagerStats();
    const adminStats = {
      engines: engines.length,
      ...managerStats,
    };

    return {
      ...finalBaseStats,
      userStats,
      managerStats,
      adminStats,
      hasRealData,
    };
  }, [engines, filteredInstances, deploymentData]);

  // chart data
  const instanceDistributionData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Completed', value: Math.max(stats.completedInstances, 0), color: COLORS.blue },
      { name: 'Running', value: Math.max(stats.runningInstances, 0), color: COLORS.green },
      { name: 'Paused', value: Math.max(stats.pausedInstances, 0), color: COLORS.orange },
      { name: 'Stopped', value: Math.max(stats.stoppedInstances, 0), color: COLORS.gray },
      { name: 'Failed', value: Math.max(stats.failedInstances, 0), color: COLORS.red },
    ];
  }, [stats]);

  // dummy weekly trend data
  const weeklyTrendData = useMemo(
    () => [
      { day: 'Mon', started: 8, completed: 6 },
      { day: 'Tue', started: 12, completed: 9 },
      { day: 'Wed', started: 10, completed: 11 },
      { day: 'Thu', started: 15, completed: 10 },
      { day: 'Fri', started: 9, completed: 8 },
      { day: 'Sat', started: 5, completed: 7 },
      { day: 'Sun', started: 3, completed: 4 },
    ],
    [],
  );

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    if (value !== 'custom') setCustomDateRange(null);
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setCustomDateRange(dates);
    if (dates && dates[0] && dates[1]) setTimeRange('custom');
  };

  if (isLoading || !stats) {
    return <Skeleton active />;
  }

  const tabItems = [
    {
      key: 'user',
      label: (
        <span style={{ fontSize: '16px', fontWeight: 500 }}>
          <HiUser style={{ marginRight: '6px', fontSize: '18px' }} />
          Your Processes
        </span>
      ),
      children: (
        <UserProcessesTab
          userStats={stats.userStats}
          instanceDistributionData={instanceDistributionData}
          weeklyTrendData={weeklyTrendData}
          totalInstances={stats.totalInstances}
        />
      ),
    },
  ];

  if (isManager) {
    tabItems.push({
      key: 'manager',
      label: (
        <span style={{ fontSize: '16px', fontWeight: 500 }}>
          <HiUserGroup style={{ marginRight: '6px', fontSize: '18px' }} />
          Manager Overview
        </span>
      ),
      children: (
        <ManagerOverviewTab
          managerStats={stats.managerStats}
          instanceDistributionData={instanceDistributionData}
          weeklyTrendData={weeklyTrendData}
          totalInstances={stats.totalInstances}
        />
      ),
    });
  }

  if (isAdmin) {
    tabItems.push({
      key: 'admin',
      label: (
        <span style={{ fontSize: '16px', fontWeight: 500 }}>
          <HiShieldCheck style={{ marginRight: '6px', fontSize: '18px' }} />
          Admin Overview
        </span>
      ),
      children: (
        <AdminOverviewTab
          adminStats={stats.adminStats}
          instanceDistributionData={instanceDistributionData}
          totalInstances={stats.totalInstances}
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
          marginBottom: '24px',
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: '12px',
        }}
        tabBarExtraContent={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
              style={{ width: 150 }}
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