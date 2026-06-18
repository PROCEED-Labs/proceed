'use client';

import { Col, Row, Typography } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, HourglassOutlined } from '@ant-design/icons';
import { HiUser } from 'react-icons/hi';
import { MdAddTask } from 'react-icons/md';
import GaugeChart from '@/components/dashboard-charts/gauge-chart';
import RadialDistributionChart from '@/components/dashboard-charts/radial-distribution-chart';
import TimelinePerformanceCard from '@/components/dashboard-charts/timeline-performance-card';
import StatCard from '@/components/stat-card';
import BudgetOverviewChart from '@/components/dashboard-charts/budget-overview-chart';
import ProcessStatsCards from '@/components/dashboard-charts/process-stats-overview';
import ProcessActivityChart from '@/components/dashboard-charts/process-activity-chart';
import TaskOverviewChart from '@/components/dashboard-charts/task-overview-bar-chart';
import styles from '../dashboard-tabs.module.scss';
import TaskSummaryCard from '@/components/dashboard-charts/task-summary-card';
import { DASHBOARD_COLORS as COLORS } from '@/components/dashboard-charts/dashboard-colors';
import type { calculateUserStats } from '../dashboard-utils';

const { Title } = Typography;

type UserStats = ReturnType<typeof calculateUserStats>;

interface DistributionDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface UserProcessesTabProps {
  userStats: UserStats;
  instanceDistributionData: DistributionDataPoint[];
  weeklyTrendData: UserStats['weeklyData'];
}

const UserProcessesTab: React.FC<UserProcessesTabProps> = ({
  userStats,
  instanceDistributionData,
  weeklyTrendData,
}) => {
  return (
    <>
      {/* Process Initiator Section */}
      <Title level={4} className={styles.sectionTitleNoTop}>
        <HiUser className={styles.iconMarginRight} /> Your Processes
      </Title>

      <ProcessStatsCards
        accessibleProcesses={userStats.accessibleProcesses}
        executableProcesses={userStats.executableProcesses}
        runningProcesses={userStats.runningProcesses}
        pausedProcesses={userStats.pausedProcesses}
        completedProcesses={userStats.completedProcesses}
        startedProcesses={userStats.startedProcesses}
      />

      <Row gutter={[16, 16]} className={styles.rowMarginBottom}>
        <Col xs={24} lg={12}>
          <RadialDistributionChart title="Instance Distribution" data={instanceDistributionData} />
        </Col>
        <Col xs={24} lg={12}>
          <TimelinePerformanceCard
            title="Process Timeline Performance"
            onSchedule={userStats.onSchedule}
            closeToExceed={userStats.closeToExceed}
            exceededTime={userStats.exceededTime}
            onScheduleRunning={userStats.onScheduleRunning}
            closeToExceedRunning={userStats.closeToExceedRunning}
            exceededTimeRunning={userStats.exceededTimeRunning}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.rowMarginBottom}>
        <Col xs={24} lg={12}>
          <ProcessActivityChart
            title="Weekly Process Activity"
            data={weeklyTrendData}
            dataKeys={{
              x: 'day',
              line1: { key: 'started', name: 'Started', color: COLORS.blue },
              line2: { key: 'completed', name: 'Completed', color: COLORS.green },
            }}
          />
        </Col>
        <Col xs={24} lg={12}>
          <BudgetOverviewChart
            title="Budget Overview"
            plannedBudget={userStats.plannedBudget}
            spentBudget={userStats.spentBudget}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.rowMarginBottom}>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Avg. Open Process Time"
            value={userStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Avg. Completed Time"
            value={userStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Longest Running Process"
            value={userStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            precision={1}
          />
        </Col>
      </Row>

      {/* Participant Section */}
      <Title level={4} className={styles.sectionTitleTopGap}>
        <MdAddTask className={styles.iconMarginRight} /> Your Tasks (As Participant)
      </Title>

      <Row gutter={[16, 16]} className={styles.rowMarginBottom}>
        <Col xs={24}>
          <TaskSummaryCard userStats={userStats} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <GaugeChart
            title="Direct Task Completion Rate"
            percentage={
              userStats.yourCompletedTasks + userStats.yourOpenTasks > 0
                ? (userStats.yourCompletedTasks /
                    (userStats.yourCompletedTasks + userStats.yourOpenTasks)) *
                  100
                : 0
            }
            completed={userStats.yourCompletedTasks}
            total={userStats.yourCompletedTasks + userStats.yourOpenTasks}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} lg={12}>
          <TaskOverviewChart
            yourOpenTasks={userStats.yourOpenTasks}
            yourCompletedTasks={userStats.yourCompletedTasks}
            groupOpenTasks={userStats.groupOpenTasks}
            groupCompletedTasks={userStats.groupCompletedTasks}
            unassignedTasks={userStats.isAdmin ? userStats.unassignedTasks : undefined}
            isOrganization={userStats.isOrganization}
          />
        </Col>
      </Row>
    </>
  );
};

export default UserProcessesTab;
