'use client';

import { Card, Col, Row, Space, Typography, Statistic } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, HourglassOutlined } from '@ant-design/icons';
import { HiUser } from 'react-icons/hi';
import { MdPlayArrow, MdCheckCircle, MdAddTask } from 'react-icons/md';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import GaugeChart from '@/components/dashboard-charts/gauge-chart';
import RadialDistributionChart from '@/components/dashboard-charts/radial-distribution-chart';
import TimelinePerformanceCard from '@/components/dashboard-charts/timeline-performance-card';
import StatCard from '@/components/stat-card';
import BudgetOverviewChart from '@/components/dashboard-charts/budget-overview-chart';
import ProcessStatsCards from '@/components/dashboard-charts/process-stats-overview';
import ProcessActivityChart from '@/components/dashboard-charts/process-activity-chart';

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
  totalInstances: number;
}

const UserProcessesTab: React.FC<UserProcessesTabProps> = ({
  userStats,
  instanceDistributionData,
  weeklyTrendData,
  totalInstances,
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
          <RadialDistributionChart
            title="Instance Distribution"
            data={[
              {
                name: 'Failed',
                value:
                  totalInstances > 0
                    ? ((instanceDistributionData.find((d) => d.name === 'Failed')?.value || 0) /
                        totalInstances) *
                      100
                    : 0,
                fill: COLORS.red,
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
                fill: COLORS.orange,
              },
              {
                name: 'Running',
                value:
                  totalInstances > 0
                    ? ((instanceDistributionData.find((d) => d.name === 'Running')?.value || 1) /
                        totalInstances) *
                      100
                    : 35.7,
                fill: COLORS.green,
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
            plannedBudget={15000}
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
          <Card bordered={false}>
            <Statistic
              title={<Text type="secondary">Open Tasks</Text>}
              value={userStats.openTasks}
              prefix={<MdPlayArrow style={{ color: COLORS.orange, fontSize: '24px' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 600, color: COLORS.orange }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false}>
            <Statistic
              title={<Text type="secondary">Completed Tasks</Text>}
              value={userStats.completedTasks}
              prefix={<MdCheckCircle style={{ color: COLORS.green, fontSize: '24px' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 600, color: COLORS.green }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <GaugeChart
            title="Task Completion Rate"
            percentage={
              (userStats.completedTasks / (userStats.completedTasks + userStats.openTasks)) * 100
            }
            completed={userStats.completedTasks}
            total={userStats.completedTasks + userStats.openTasks}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Daily Task Completion" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={weeklyTrendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorTaskDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke={COLORS.green}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTaskDaily)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default UserProcessesTab;
