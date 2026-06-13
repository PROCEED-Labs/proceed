'use client';

import { Card, Col, Row, Typography, Statistic } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, HourglassOutlined } from '@ant-design/icons';
import { HiUser } from 'react-icons/hi';
import { MdPlayArrow, MdCheckCircle, MdAddTask } from 'react-icons/md';
import GaugeChart from '@/components/dashboard-charts/gauge-chart';
import RadialDistributionChart from '@/components/dashboard-charts/radial-distribution-chart';
import TimelinePerformanceCard from '@/components/dashboard-charts/timeline-performance-card';
import StatCard from '@/components/stat-card';
import BudgetOverviewChart from '@/components/dashboard-charts/budget-overview-chart';
import ProcessStatsCards from '@/components/dashboard-charts/process-stats-overview';
import ProcessActivityChart from '@/components/dashboard-charts/process-activity-chart';
import TaskOverviewChart from '@/components/dashboard-charts/task-overview-bar-chart';

const { Title, Text } = Typography;

const COLORS = {
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  gray: '#8c8c8c',
};

interface UserProcessesTabProps {
  userStats: any;
  instanceDistributionData: any[];
  weeklyTrendData: any[];
}

const UserProcessesTab: React.FC<UserProcessesTabProps> = ({
  userStats,
  instanceDistributionData,
  weeklyTrendData,
}) => {
  return (
    <>
      {/* Process Initiator Section */}
      <Title level={4} style={{ marginBottom: '16px', marginTop: '0' }}>
        <HiUser style={{ marginRight: '8px' }} /> Your Processes
      </Title>

      <ProcessStatsCards
        accessibleProcesses={userStats.accessibleProcesses}
        executableProcesses={userStats.executableProcesses}
        runningProcesses={userStats.runningProcesses}
        pausedProcesses={userStats.pausedProcesses}
        completedProcesses={userStats.completedProcesses}
        startedProcesses={userStats.startedProcesses}
        type="user"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <RadialDistributionChart title="Instance Distribution" data={instanceDistributionData} />
        </Col>
        <Col xs={24} lg={12}>
          <TimelinePerformanceCard
            title="Process Timeline Performance"
            onSchedule={userStats.onSchedule}
            closeToExceed={userStats.closeToExceed}
            exceededTime={userStats.exceededTime}
            runningProcesses={userStats.runningProcesses}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
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

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Avg. Open Process Time"
            value={userStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Avg. Completed Time"
            value={userStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Longest Running Process"
            value={userStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            suffix="hrs"
            precision={1}
          />
        </Col>
      </Row>

      {/* Participant Section */}
      <Title level={4} style={{ marginBottom: '16px', marginTop: '32px' }}>
        <MdAddTask style={{ marginRight: '8px' }} /> Your Tasks (As Participant)
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12}>
          <Card variant="borderless">
            <Statistic
              title={<Text type="secondary">Open Tasks</Text>}
              value={userStats.openTasks}
              prefix={<MdPlayArrow style={{ color: COLORS.orange, fontSize: '24px' }} />}
              styles={{
                content: {
                  fontSize: '32px',
                  fontWeight: 600,
                  color: COLORS.orange,
                },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card variant="borderless">
            <Statistic
              title={<Text type="secondary">Completed Tasks</Text>}
              value={userStats.completedTasks}
              prefix={<MdCheckCircle style={{ color: COLORS.green, fontSize: '24px' }} />}
              styles={{
                content: {
                  fontSize: '32px',
                  fontWeight: 600,
                  color: COLORS.green,
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <GaugeChart
            title="Task Completion Rate"
            percentage={
              userStats.completedTasks + userStats.openTasks > 0
                ? (userStats.completedTasks / (userStats.completedTasks + userStats.openTasks)) *
                  100
                : 0
            }
            completed={userStats.completedTasks}
            total={userStats.completedTasks + userStats.openTasks}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} lg={12}>
          <TaskOverviewChart
            openTasks={userStats.openTasks}
            completedTasks={userStats.completedTasks}
          />
        </Col>
      </Row>
    </>
  );
};

export default UserProcessesTab;
