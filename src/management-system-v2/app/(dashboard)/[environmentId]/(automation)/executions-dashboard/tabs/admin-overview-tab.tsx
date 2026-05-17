'use client';

import { Card, Col, Row, Space, Typography, Progress } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { MdRocket, MdPlayArrow, MdCheckCircle } from 'react-icons/md';
import RadialDistributionChart from '@/components/dashboard-charts/radial-distribution-chart';
import TimelinePerformanceCard from '@/components/dashboard-charts/timeline-performance-card';
import StatCard from '@/components/stat-card';

const { Title, Text } = Typography;

const COLORS = {
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#f5222d',
  purple: '#722ed1',
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  gray: '#8c8c8c',
};

interface AdminOverviewTabProps {
  adminStats: any;
  instanceDistributionData: any[];
  totalInstances: number;
}

const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  adminStats,
  instanceDistributionData,
  totalInstances,
}) => {
  return (
    <>
      <Title level={4} style={{ marginBottom: '16px' }}>
        <MdRocket style={{ marginRight: '8px' }} /> System Overview
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Engines Online"
            value={adminStats.engines}
            icon={<MdRocket />}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Running Processes"
            value={adminStats.runningProcesses}
            icon={<MdPlayArrow />}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Completed Processes"
            value={adminStats.completedProcesses}
            icon={<MdCheckCircle />}
            color={COLORS.blue}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Processes"
            value={adminStats.startedProcesses}
            icon={<MdPlayArrow />}
            color={COLORS.purple}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <RadialDistributionChart
            title="System Instance Distribution"
            data={[
              {
                name: 'Failed',
                value:
                  totalInstances > 0
                    ? ((instanceDistributionData.find((d) => d.name === 'Failed')?.value || 0) /
                        totalInstances) *
                      100
                    : 0,
                fill: COLORS.error,
              },
              {
                name: 'Stopped',
                value:
                  totalInstances > 0
                    ? ((instanceDistributionData.find((d) => d.name === 'Stopped')?.value || 0) /
                        totalInstances) *
                      100
                    : 0,
                fill: COLORS.gray,
              },
              {
                name: 'Paused',
                value:
                  totalInstances > 0
                    ? ((instanceDistributionData.find((d) => d.name === 'Paused')?.value || 1) /
                        totalInstances) *
                      100
                    : 14.3,
                fill: COLORS.warning,
              },
              {
                name: 'Running',
                value:
                  totalInstances > 0
                    ? ((instanceDistributionData.find((d) => d.name === 'Running')?.value || 1) /
                        totalInstances) *
                      100
                    : 35.7,
                fill: COLORS.success,
              },
              {
                name: 'Completed',
                value:
                  totalInstances > 0
                    ? ((instanceDistributionData.find((d) => d.name === 'Completed')?.value || 1) /
                        totalInstances) *
                      100
                    : 50,
                fill: COLORS.blue,
              },
            ]}
          />
        </Col>
        <Col xs={24} lg={12}>
          <TimelinePerformanceCard
            title="System Timeline Performance"
            onSchedule={adminStats.onSchedule}
            closeToExceed={adminStats.closeToExceed}
            exceededTime={adminStats.exceededTime}
            runningProcesses={adminStats.runningProcesses}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="System Avg. Open Time"
            value={adminStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="System Avg. Completed"
            value={adminStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Longest Running Process"
            value={adminStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.error}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Budget Spent"
            value={adminStats.spentBudget}
            icon={<DollarOutlined />}
            color={COLORS.purple}
            prefix="$"
          />
        </Col>
      </Row>
    </>
  );
};

export default AdminOverviewTab;
