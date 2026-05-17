'use client';

import { useMemo, useState } from 'react';
import useDeployments from './use-deployments';
import {
  Card,
  Col,
  Row,
  Skeleton,
  Select,
  Statistic,
  Progress,
  Space,
  Typography,
  DatePicker,
  TreeSelect,
  Tabs,
} from 'antd';
import {
  RocketOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  HourglassOutlined,
  FolderOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PolarAngleAxis,
} from 'recharts';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type TimeRange = 'week' | 'month' | 'year' | 'custom';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  suffix?: string;
  prefix?: string;
  precision?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#1677ff',
  suffix,
  prefix,
  precision = 0,
}) => (
  <Card bordered={false} style={{ height: '100%' }}>
    <Statistic
      title={<Text type="secondary">{title}</Text>}
      value={value}
      precision={precision}
      prefix={
        prefix ? (
          prefix
        ) : (
          <span style={{ color, fontSize: '20px', marginRight: '8px' }}>{icon}</span>
        )
      }
      suffix={suffix}
      valueStyle={{ fontSize: '24px', fontWeight: 600 }}
    />
  </Card>
);

const COLORS = {
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#f5222d',
  purple: '#722ed1',
  blue: '#16b1ffff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  gray: '#8c8c8cff',
  lightBlue: '#69c0ff',
  teal: '#13c2c2',
};

const DashboardView: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('root');
  const [activeTab, setActiveTab] = useState<string>('user');

  // TODO: Replace with actual user role check
  const isManager = true; // Replace with: currentUser.role === 'manager' || currentUser.role === 'admin'
  const isAdmin = true; // Replace with: currentUser.role === 'admin'

  const { engines, deployments } = useDeployments(
    'definitionId,instances(processInstanceId,instanceState)',
  );
  console.log(deployments);

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

  const stats = useMemo(() => {
    if (!engines || !deployments) return null;

    const activeStates = ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'];
    const failedStates = [
      'ABORTED',
      'FAILED',
      'ERROR-SEMANTIC',
      'ERROR-TECHNICAL',
      'ERROR-CONSTRAINT-UNFULFILLED',
      'ERROR-UNKNOWN',
    ];

    const knownDeployments: Record<string, boolean> = {};
    const knownInstances: Record<string, string[]> = {};

    let numDeployments = 0;
    let numRunningInstances = 0;
    let numFailedInstances = 0;
    let numCompletedInstances = 0;
    let numPausedInstances = 0;

    for (const { definitionId, instances } of deployments) {
      if (!knownDeployments[definitionId]) {
        numDeployments++;
        knownDeployments[definitionId] = true;
      }

      for (const { processInstanceId, instanceState } of instances) {
        if (!knownInstances[processInstanceId]) {
          knownInstances[processInstanceId] = instanceState;
        } else {
          knownInstances[processInstanceId].push(...instanceState);
        }
      }
    }

    for (const instanceState of Object.values(knownInstances)) {
      if (instanceState.includes('PAUSED')) {
        numPausedInstances++;
      } else if (instanceState.some((state) => activeStates.includes(state))) {
        numRunningInstances++;
      } else if (instanceState.some((state) => failedStates.includes(state))) {
        numFailedInstances++;
      } else {
        numCompletedInstances++;
      }
    }

    const totalInstances =
      numRunningInstances + numFailedInstances + numCompletedInstances + numPausedInstances;
    const hasRealData = totalInstances > 0;

    const placeholderData = {
      deployments: 3,
      totalInstances: 14,
      runningInstances: 5,
      pausedInstances: 2,
      failedInstances: 0,
      completedInstances: 7,
    };

    const baseStats = hasRealData
      ? {
          deployments: numDeployments,
          totalInstances,
          runningInstances: numRunningInstances,
          pausedInstances: numPausedInstances,
          failedInstances: numFailedInstances,
          completedInstances: numCompletedInstances,
        }
      : placeholderData;

    const userStats = {
      accessibleProcesses: hasRealData ? numDeployments : 3,
      executableProcesses: hasRealData ? Math.floor(numDeployments * 0.67) : 2,
      startedProcesses: hasRealData ? totalInstances : 14,
      runningProcesses: hasRealData ? Math.max(numRunningInstances, 1) : 5,
      pausedProcesses: hasRealData ? numPausedInstances : 2,
      completedProcesses: hasRealData ? Math.max(numCompletedInstances, 1) : 7,
      onSchedule: hasRealData ? Math.max(Math.floor(numRunningInstances * 0.6), 1) : 3,
      exceededTime: hasRealData ? Math.max(Math.floor(numRunningInstances * 0.2), 1) : 1,
      closeToExceed: hasRealData ? Math.max(Math.floor(numRunningInstances * 0.2), 1) : 1,
      avgOpenTime: 4.5,
      avgCompletedTime: 2.3,
      longestRunning: 12.8,
      spentBudget: 12500,
      completedRegular: hasRealData ? Math.max(numCompletedInstances, 1) : 7,
      completedWithError: hasRealData ? numFailedInstances : 0,
      openTasks: hasRealData ? Math.max(Math.floor(numRunningInstances * 1.4), 1) : 7,
      completedTasks: hasRealData ? Math.max(Math.floor(numCompletedInstances * 2.1), 1) : 15,
    };

    const managerStats = {
      accessibleProcesses: 45,
      executableProcesses: 38,
      startedProcesses: 128,
      runningProcesses: 42,
      pausedProcesses: 12,
      completedProcesses: 74,
      onSchedule: 30,
      exceededTime: 6,
      closeToExceed: 6,
      avgOpenTime: 5.2,
      avgCompletedTime: 3.1,
      longestRunning: 18.5,
      spentBudget: 45600,
      completedRegular: 68,
      completedWithError: 6,
    };

    const adminStats = {
      engines: engines.length || 1,
      ...managerStats,
    };

    return { ...baseStats, userStats, managerStats, adminStats };
  }, [engines, deployments]);

  // Chart data
  const instanceDistributionData = useMemo(() => {
    if (!stats)
      return [
        { name: 'Completed', value: 7, color: COLORS.blue },
        { name: 'Running', value: 5, color: COLORS.green },
        { name: 'Paused', value: 2, color: COLORS.orange },
        { name: 'Stopped', value: 1, color: COLORS.gray },
        { name: 'Failed', value: 0, color: COLORS.red },
      ];

    const stoppedInstances = Math.max(Math.floor(stats.totalInstances * 0.05), 1);

    return [
      { name: 'Completed', value: Math.max(stats.completedInstances, 1), color: COLORS.blue },
      { name: 'Running', value: stats.runningInstances || 1, color: COLORS.green },
      { name: 'Paused', value: stats.pausedInstances || 1, color: COLORS.orange },
      { name: 'Stopped', value: stoppedInstances, color: COLORS.gray },
      { name: 'Failed', value: stats.failedInstances || 0, color: COLORS.red },
    ];
  }, [stats]);

  const processTimelineData = useMemo(() => {
    if (!stats)
      return [
        { name: 'On Schedule', value: 3, color: COLORS.green },
        { name: 'Close to Exceed', value: 1, color: COLORS.orange },
        { name: 'Exceeded', value: 1, color: COLORS.red },
      ];

    return [
      { name: 'On Schedule', value: stats.userStats.onSchedule, color: COLORS.green },
      { name: 'Close to Exceed', value: stats.userStats.closeToExceed, color: COLORS.orange },
      { name: 'Exceeded', value: stats.userStats.exceededTime, color: COLORS.red },
    ];
  }, [stats]);

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

  const performanceTrendData = useMemo(
    () => [
      { week: 'Week 1', avgTime: 3.2 },
      { week: 'Week 2', avgTime: 2.8 },
      { week: 'Week 3', avgTime: 3.5 },
      { week: 'Week 4', avgTime: 2.3 },
    ],
    [],
  );

  if (!stats) return <Skeleton active />;

  const folderTreeData = [
    {
      title: 'Root',
      value: 'root',
      children: [
        { title: 'HR Processes', value: 'hr' },
        { title: 'Finance Processes', value: 'finance' },
        { title: 'Operations', value: 'operations' },
      ],
    },
  ];

  // user tab content
  const UserTabContent = (
    <>
      {/* Process Initiator Section */}
      <Title level={4} style={{ marginBottom: '16px', marginTop: '24px' }}>
        <UserOutlined /> Your Processes (As Initiator)
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">Accessible Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {stats.userStats.accessibleProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Executable Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {stats.userStats.executableProcesses}
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
                  {stats.userStats.runningProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Paused Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600, color: COLORS.orange }}>
                  {stats.userStats.pausedProcesses}
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
                  {stats.userStats.completedProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Started Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {stats.userStats.startedProcesses}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Instance Distribution" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="80%"
                barSize={16}
                data={[
                  {
                    name: 'Failed',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Failed')?.value || 0) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.error,
                  },
                  {
                    name: 'Stopped',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Stopped')?.value || 1) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.gray,
                  },
                  {
                    name: 'Paused',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Paused')?.value || 1) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.warning,
                  },
                  {
                    name: 'Running',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Running')?.value || 1) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.success,
                  },
                  {
                    name: 'Completed',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Completed')?.value || 1) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.blue,
                  },
                ]}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background clockWise dataKey="value" />
                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                <Tooltip formatter={(value) => (value ? `${Number(value).toFixed(1)}%` : '')} />
              </RadialBarChart>
            </ResponsiveContainer>
          </Card>
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
          <Card title="Process Timeline Performance" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>On Schedule</Text>
                  <Text strong>{stats.userStats.onSchedule}</Text>
                </div>
                <Progress
                  percent={
                    stats.userStats.runningProcesses > 0
                      ? (stats.userStats.onSchedule / stats.userStats.runningProcesses) * 100
                      : 0
                  }
                  strokeColor={COLORS.success}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>Close to Exceed (10%)</Text>
                  <Text strong>{stats.userStats.closeToExceed}</Text>
                </div>
                <Progress
                  percent={
                    stats.userStats.runningProcesses > 0
                      ? (stats.userStats.closeToExceed / stats.userStats.runningProcesses) * 100
                      : 0
                  }
                  strokeColor={COLORS.warning}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>Exceeded Time</Text>
                  <Text strong>{stats.userStats.exceededTime}</Text>
                </div>
                <Progress
                  percent={
                    stats.userStats.runningProcesses > 0
                      ? (stats.userStats.exceededTime / stats.userStats.runningProcesses) * 100
                      : 0
                  }
                  strokeColor={COLORS.error}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
            </Space>
          </Card>
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
            value={stats.userStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Avg. Completed Time"
            value={stats.userStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Longest Running Process"
            value={stats.userStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Budget Spent"
            value={stats.userStats.spentBudget}
            icon={<DollarOutlined />}
            color={COLORS.purple}
            prefix="$"
          />
        </Col>
      </Row>

      {/* Participant Section */}
      <Title level={4} style={{ marginBottom: '16px', marginTop: '48px' }}>
        <TeamOutlined /> Your Tasks (As Participant)
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12}>
          <Card bordered={false}>
            <Statistic
              title={<Text type="secondary">Open Tasks</Text>}
              value={stats.userStats.openTasks}
              prefix={<PlayCircleOutlined style={{ color: COLORS.orange, fontSize: '24px' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 600, color: COLORS.orange }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false}>
            <Statistic
              title={<Text type="secondary">Completed Tasks</Text>}
              value={stats.userStats.completedTasks}
              prefix={<CheckCircleOutlined style={{ color: COLORS.green, fontSize: '24px' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 600, color: COLORS.green }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Task Completion Rate" bordered={false}>
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  barSize={30}
                  data={[
                    {
                      name: 'Completion',
                      value:
                        (stats.userStats.completedTasks /
                          (stats.userStats.completedTasks + stats.userStats.openTasks)) *
                        100,
                      fill: COLORS.success,
                    },
                  ]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: '#f0f0f0' }} dataKey="value" cornerRadius={10} />
                  <Tooltip formatter={(value) => (value ? `${Number(value).toFixed(1)}%` : '')} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: COLORS.success }}>
                  {(
                    (stats.userStats.completedTasks /
                      (stats.userStats.completedTasks + stats.userStats.openTasks)) *
                    100
                  ).toFixed(0)}
                  %
                </div>
                <div style={{ fontSize: '16px', color: '#8c8c8c', marginTop: '8px' }}>
                  {stats.userStats.completedTasks} /{' '}
                  {stats.userStats.completedTasks + stats.userStats.openTasks} Tasks
                </div>
              </div>
            </div>
          </Card>
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

  // manager tab content
  const ManagerTabContent = (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Space>
          <FolderOutlined />
          <Text type="secondary">Folder:</Text>
          <TreeSelect
            value={selectedFolder}
            onChange={setSelectedFolder}
            treeData={folderTreeData}
            style={{ width: 200 }}
            placeholder="Select folder"
          />
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Running Processes"
            value={stats.managerStats.runningProcesses}
            icon={<PlayCircleOutlined />}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Completed Processes"
            value={stats.managerStats.completedProcesses}
            icon={<CheckCircleOutlined />}
            color={COLORS.blue}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Paused Processes"
            value={stats.managerStats.pausedProcesses}
            icon={<PauseCircleOutlined />}
            color={COLORS.orange}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Processes"
            value={stats.managerStats.startedProcesses}
            icon={<PlayCircleOutlined />}
            color={COLORS.purple}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Team Timeline Performance" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>On Schedule</Text>
                  <Text strong>{stats.managerStats.onSchedule}</Text>
                </div>
                <Progress
                  percent={
                    stats.managerStats.runningProcesses > 0
                      ? (stats.managerStats.onSchedule / stats.managerStats.runningProcesses) * 100
                      : 0
                  }
                  strokeColor={COLORS.success}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>Close to Exceed (10%)</Text>
                  <Text strong>{stats.managerStats.closeToExceed}</Text>
                </div>
                <Progress
                  percent={
                    stats.managerStats.runningProcesses > 0
                      ? (stats.managerStats.closeToExceed / stats.managerStats.runningProcesses) *
                        100
                      : 0
                  }
                  strokeColor={COLORS.warning}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>Exceeded Time</Text>
                  <Text strong>{stats.managerStats.exceededTime}</Text>
                </div>
                <Progress
                  percent={
                    stats.managerStats.runningProcesses > 0
                      ? (stats.managerStats.exceededTime / stats.managerStats.runningProcesses) *
                        100
                      : 0
                  }
                  strokeColor={COLORS.error}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Team Process Activity" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={[
                  { month: 'Jan', completed: 45, failed: 3 },
                  { month: 'Feb', completed: 52, failed: 2 },
                  { month: 'Mar', completed: 48, failed: 4 },
                  { month: 'Apr', completed: 58, failed: 2 },
                  { month: 'May', completed: 68, failed: 6 },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
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
                  dataKey="completed"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke={COLORS.error}
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Avg. Open Time"
            value={stats.managerStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Avg. Completed Time"
            value={stats.managerStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Longest Running"
            value={stats.managerStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Budget Spent"
            value={stats.managerStats.spentBudget}
            icon={<DollarOutlined />}
            color={COLORS.purple}
            prefix="$"
          />
        </Col>
      </Row>
    </>
  );

  // admin tab content
  const AdminTabContent = (
    <>
      <Title level={4} style={{ marginBottom: '16px' }}>
        <RocketOutlined /> System Overview
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Engines Online"
            value={stats.adminStats.engines}
            icon={<RocketOutlined />}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Running Processes"
            value={stats.adminStats.runningProcesses}
            icon={<PlayCircleOutlined />}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Completed Processes"
            value={stats.adminStats.completedProcesses}
            icon={<CheckCircleOutlined />}
            color={COLORS.blue}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Processes"
            value={stats.adminStats.startedProcesses}
            icon={<PlayCircleOutlined />}
            color={COLORS.purple}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="System Instance Distribution" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="80%"
                barSize={16}
                data={[
                  {
                    name: 'Failed',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Failed')?.value || 0) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.error,
                  },
                  {
                    name: 'Stopped',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Stopped')?.value || 1) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.gray,
                  },
                  {
                    name: 'Paused',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Paused')?.value || 1) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.warning,
                  },
                  {
                    name: 'Running',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Running')?.value || 1) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.success,
                  },
                  {
                    name: 'Completed',
                    value:
                      ((instanceDistributionData.find((d) => d.name === 'Completed')?.value || 1) /
                        stats.totalInstances) *
                      100,
                    fill: COLORS.blue,
                  },
                ]}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" />
                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                <Tooltip formatter={(value) => (value ? `${Number(value).toFixed(1)}%` : '')} />
              </RadialBarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="System Timeline Performance" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>On Schedule</Text>
                  <Text strong>{stats.adminStats.onSchedule}</Text>
                </div>
                <Progress
                  percent={
                    stats.adminStats.runningProcesses > 0
                      ? (stats.adminStats.onSchedule / stats.adminStats.runningProcesses) * 100
                      : 0
                  }
                  strokeColor={COLORS.success}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>Close to Exceed (10%)</Text>
                  <Text strong>{stats.adminStats.closeToExceed}</Text>
                </div>
                <Progress
                  percent={
                    stats.adminStats.runningProcesses > 0
                      ? (stats.adminStats.closeToExceed / stats.adminStats.runningProcesses) * 100
                      : 0
                  }
                  strokeColor={COLORS.warning}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <Text>Exceeded Time</Text>
                  <Text strong>{stats.adminStats.exceededTime}</Text>
                </div>
                <Progress
                  percent={
                    stats.adminStats.runningProcesses > 0
                      ? (stats.adminStats.exceededTime / stats.adminStats.runningProcesses) * 100
                      : 0
                  }
                  strokeColor={COLORS.error}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="System Avg. Open Time"
            value={stats.adminStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="System Avg. Completed"
            value={stats.adminStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Longest Running Process"
            value={stats.adminStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Budget Spent"
            value={stats.adminStats.spentBudget}
            icon={<DollarOutlined />}
            color={COLORS.purple}
            prefix="$"
          />
        </Col>
      </Row>
    </>
  );

  // Build tabs based on user role
  const tabItems = [
    {
      key: 'user',
      label: (
        <span>
          <UserOutlined /> Your Processes
        </span>
      ),
      children: UserTabContent,
    },
  ];

  if (isManager) {
    tabItems.push({
      key: 'manager',
      label: (
        <span>
          <TeamOutlined /> Manager Overview
        </span>
      ),
      children: ManagerTabContent,
    });
  }

  if (isAdmin) {
    tabItems.push({
      key: 'admin',
      label: (
        <span>
          <CrownOutlined /> Admin Overview
        </span>
      ),
      children: AdminTabContent,
    });
  }

  return (
    <div>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Space
          style={{
            display: 'flex',
            alignContent: 'end',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            justifyItems: 'flex-end',
          }}
        >
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

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />
    </div>
  );
};

export default DashboardView;
