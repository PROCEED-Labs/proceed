'use client';

import { Card, Col, Row, Space, Typography, Statistic } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { HiUser, HiUserGroup } from 'react-icons/hi';
import { MdPlayArrow, MdCheckCircle } from 'react-icons/md';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import GaugeChart from '@/components/dashboard-charts/gauge-chart';
import RadialDistributionChart from '@/components/dashboard-charts/radial-distribution-chart';
import TimelinePerformanceCard from '@/components/dashboard-charts/timeline-performance-card';
import StatCard from '@/components/stat-card';

const { Title, Text } = Typography;

const COLORS = {
  primary: '#1677ff',
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

interface UserProcessesTabProps {
  userStats: any;
  instanceDistributionData: any[];
  processTimelineData: any[];
  weeklyTrendData: any[];
  totalInstances: number;
}

const UserProcessesTab: React.FC<UserProcessesTabProps> = ({
  userStats,
  instanceDistributionData,
  processTimelineData,
  weeklyTrendData,
  totalInstances,
}) => {
  return (
    <>
      {/* Process Initiator Section */}
      <Title level={4} style={{ marginBottom: '16px' }}>
        <HiUser style={{ marginRight: '8px' }} /> Your Processes (As Initiator)
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">Accessible Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {userStats.accessibleProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Executable Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {userStats.executableProcesses}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">Running Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600, color: COLORS.green }}>
                  {userStats.runningProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Paused Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600, color: COLORS.orange }}>
                  {userStats.pausedProcesses}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">Completed Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {userStats.completedProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Started Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {userStats.startedProcesses}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

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
          <Card title="Process Timeline Status" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={processTimelineData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {processTimelineData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === 'On Schedule'
                          ? COLORS.success
                          : entry.name === 'Close to Exceed'
                            ? COLORS.warning
                            : COLORS.error
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <TimelinePerformanceCard
            title="Process Timeline Performance"
            onSchedule={userStats.onSchedule}
            closeToExceed={userStats.closeToExceed}
            exceededTime={userStats.exceededTime}
            runningProcesses={userStats.runningProcesses}
          />
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Weekly Process Activity" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={weeklyTrendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="started"
                  stroke={COLORS.blue}
                  strokeWidth={3}
                  dot={{ fill: COLORS.blue, r: 5 }}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke={COLORS.green}
                  strokeWidth={3}
                  dot={{ fill: COLORS.green, r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Avg. Open Process Time"
            value={userStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Avg. Completed Time"
            value={userStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Longest Running Process"
            value={userStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Budget Spent"
            value={userStats.spentBudget}
            icon={<DollarOutlined />}
            color={COLORS.purple}
            prefix="$"
          />
        </Col>
      </Row>

      {/* Participant Section */}
      <Title level={4} style={{ marginBottom: '16px', marginTop: '40px' }}>
        <HiUserGroup style={{ marginRight: '8px' }} /> Your Tasks (As Participant)
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
            color={COLORS.success}
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
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.1} />
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
                  stroke={COLORS.success}
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
