'use client';

import { useMemo, useState } from 'react';
import { Select, Space, DatePicker, Tabs } from 'antd';
import { HiUser, HiUserGroup, HiShieldCheck } from 'react-icons/hi';
import type { Dayjs } from 'dayjs';
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

interface DeployedProcess {
  id: string;
  name: string;
  versions: any[];
  instances: any[];
}

interface DashboardProps {
  deployedProcesses: DeployedProcess[];
  engines: any[];
  userRole: 'user' | 'manager' | 'admin';
  userId: string;
  spaceId: string;
}

const COLORS = {
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  gray: '#8c8c8c',
};

const DashboardView: React.FC<DashboardProps> = ({
  deployedProcesses,
  engines,
  userRole,
  userId,
  spaceId,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [activeTab, setActiveTab] = useState<string>('user');

  const isManager = userRole === 'manager' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  // calculate date range based on selection
  const dateRange = useMemo(() => {
    if (timeRange === 'custom' && customDateRange && customDateRange[0] && customDateRange[1]) {
      return {
        start: customDateRange[0].toDate(),
        end: customDateRange[1].toDate(),
      };
    }

    const end = new Date();
    let start = new Date();

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

  // filter deployed processes by date range
  const filteredDeployedProcesses = useMemo(() => {
    return filterInstancesByDateRange(deployedProcesses, dateRange.start, dateRange.end);
  }, [deployedProcesses, dateRange]);

  // calculate stats from filtered data
  const stats = useMemo(() => {
    const baseStats = calculateInstanceStats(filteredDeployedProcesses);
    const hasRealData = baseStats.totalInstances > 0;

    // use real data if available, otherwise dummy
    const finalBaseStats = hasRealData ? baseStats : getDummyStats();

    const userStats = calculateUserStats(finalBaseStats);
    const managerStats = calculateManagerStats();
    const adminStats = {
      engines: engines.length, // real data: engine count
      ...managerStats, // manager sattes dummy for now
    };

    return {
      ...finalBaseStats,
      userStats,
      managerStats,
      adminStats,
      hasRealData,
    };
  }, [filteredDeployedProcesses, engines]);

  // chart data
  const instanceDistributionData = useMemo(
    () => [
      { name: 'Completed', value: Math.max(stats.completedInstances, 0), color: COLORS.blue },
      { name: 'Running', value: Math.max(stats.runningInstances, 0), color: COLORS.green },
      { name: 'Paused', value: Math.max(stats.pausedInstances, 0), color: COLORS.orange },
      { name: 'Stopped', value: Math.max(stats.stoppedInstances, 0), color: COLORS.gray },
      { name: 'Failed', value: Math.max(stats.failedInstances, 0), color: COLORS.red },
    ],
    [stats],
  );

  const processTimelineData = useMemo(
    () => [
      { name: 'On Schedule', value: stats.userStats.onSchedule, color: COLORS.green },
      { name: 'Close to Exceed', value: stats.userStats.closeToExceed, color: COLORS.orange },
      { name: 'Exceeded', value: stats.userStats.exceededTime, color: COLORS.red },
    ],
    [stats],
  );

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
    if (value !== 'custom') {
      setCustomDateRange(null);
    }
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setCustomDateRange(dates);
    if (dates && dates[0] && dates[1]) {
      setTimeRange('custom');
    }
  };

  // build tabs based on user role
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
          processTimelineData={processTimelineData}
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
      children: <ManagerOverviewTab managerStats={stats.managerStats} />,
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
      {/* Time Range Selector */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <Space>
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
          {timeRange === 'custom' && (
            <RangePicker
              value={customDateRange}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              placeholder={['Start Date', 'End Date']}
            />
          )}
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        style={{
          marginTop: '0',
        }}
        tabBarStyle={{
          marginBottom: '24px',
          borderBottom: '2px solid #f0f0f0',
        }}
      />
    </div>
  );
};

export default DashboardView;
