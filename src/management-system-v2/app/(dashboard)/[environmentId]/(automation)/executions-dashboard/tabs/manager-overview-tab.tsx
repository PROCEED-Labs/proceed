'use client';

import { Col, Row, Space, Typography } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, HourglassOutlined } from '@ant-design/icons';
import { HiUserGroup } from 'react-icons/hi';
import RadialDistributionChart from '@/components/dashboard-charts/radial-distribution-chart';
import TimelinePerformanceCard from '@/components/dashboard-charts/timeline-performance-card';
import StatCard from '@/components/stat-card';
import BudgetOverviewChart from '@/components/dashboard-charts/budget-overview-chart';
import ProcessActivityChart from '@/components/dashboard-charts/process-activity-chart';
import { MdPlayArrow, MdCheckCircle, MdPause } from 'react-icons/md';

const { Title } = Typography;

const COLORS = {
  purple: '#722ed1',
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  gray: '#8c8c8c',
};

interface ManagerOverviewTabProps {
  managerStats: any;
  instanceDistributionData: any[];
  weeklyTrendData: any[];
  totalInstances: number;
}

const ManagerOverviewTab: React.FC<ManagerOverviewTabProps> = ({
  managerStats,
  instanceDistributionData,
  weeklyTrendData,
  totalInstances,
}) => {
  return (
    <>
      {/* Team Overview Section */}
      <Title level={4} style={{ marginBottom: '16px', marginTop: '0' }}>
        <HiUserGroup style={{ marginRight: '8px' }} /> Team Overview
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Running Processes"
            value={managerStats.runningProcesses}
            icon={<MdPlayArrow />}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Completed Processes"
            value={managerStats.completedProcesses}
            icon={<MdCheckCircle />}
            color={COLORS.blue}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Paused Processes"
            value={managerStats.pausedProcesses}
            icon={<MdPause />}
            color={COLORS.orange}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Processes"
            value={managerStats.startedProcesses}
            icon={<MdPlayArrow />}
            color={COLORS.purple}
          />
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <RadialDistributionChart
            title="Team Instance Distribution"
            data={instanceDistributionData}
          />
        </Col>
        <Col xs={24} lg={12}>
          <TimelinePerformanceCard
            title="Team Timeline Performance"
            onSchedule={managerStats.onSchedule}
            closeToExceed={managerStats.closeToExceed}
            exceededTime={managerStats.exceededTime}
            runningProcesses={managerStats.runningProcesses}
          />
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <ProcessActivityChart
            title="Team Process Activity"
            data={weeklyTrendData}
            dataKeys={{
              x: 'month',
              line1: { key: 'completed', name: 'Completed', color: COLORS.green },
              line2: { key: 'failed', name: 'Failed', color: COLORS.red },
            }}
          />
        </Col>
        <Col xs={24} lg={12}>
          <BudgetOverviewChart
            title="Team Budget Overview"
            plannedBudget={managerStats.plannedBudget}
            spentBudget={managerStats.spentBudget}
          />
        </Col>
      </Row>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Team Avg. Open Time"
            value={managerStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Team Avg. Completed Time"
            value={managerStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Team Longest Running"
            value={managerStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            suffix="hrs"
            precision={1}
          />
        </Col>
      </Row>
    </>
  );
};

export default ManagerOverviewTab;
