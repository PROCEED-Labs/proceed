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
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  ThunderboltOutlined,
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
  ComposedChart,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
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
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('root');
  const [activeTab, setActiveTab] = useState<string>('initiator');

  const { engines, deployments } = useDeployments(
    'definitionId,instances(processInstanceId,instanceState)',
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
      engines: 3,
      deployments: 12,
      totalInstances: 45,
      runningInstances: 15,
      pausedInstances: 5,
      failedInstances: 3,
      completedInstances: 22,
    };

    const baseStats = hasRealData
      ? {
          engines: engines.length,
          deployments: numDeployments,
          totalInstances,
          runningInstances: numRunningInstances,
          pausedInstances: numPausedInstances,
          failedInstances: numFailedInstances,
          completedInstances: numCompletedInstances,
        }
      : placeholderData;

    const userStats = {
      accessibleProcesses: hasRealData ? numDeployments : 12,
      executableProcesses: hasRealData ? Math.floor(numDeployments * 0.8) : 10,
      startedProcesses: hasRealData ? totalInstances : 45,
      openProcesses: hasRealData ? Math.max(numRunningInstances, 1) : 15,
      pausedProcesses: hasRealData ? numPausedInstances : 5,
      endedProcesses: hasRealData ? Math.max(numCompletedInstances, 1) : 22,
      onSchedule: hasRealData ? Math.max(Math.floor(numRunningInstances * 0.7), 1) : 11,
      exceededTime: hasRealData ? Math.max(Math.floor(numRunningInstances * 0.15), 1) : 2,
      closeToExceed: hasRealData ? Math.max(Math.floor(numRunningInstances * 0.15), 1) : 2,
      avgOpenTime: 4.5,
      avgEndedTime: 2.3,
      longestRunning: 12.8,
      spentBudget: 12500,
      endedRegular: hasRealData ? Math.max(numCompletedInstances, 1) : 22,
      endedWithError: hasRealData ? numFailedInstances : 3,
      openTasks: hasRealData ? Math.max(Math.floor(numRunningInstances * 1.5), 1) : 8,
      endedTasks: hasRealData ? Math.max(Math.floor(numCompletedInstances * 2.2), 1) : 31,
    };

    const adminStats = {
      accessibleProcesses: 45,
      executableProcesses: 38,
      startedProcesses: 128,
      openProcesses: 42,
      pausedProcesses: 12,
      endedProcesses: 74,
      onSchedule: 30,
      exceededTime: 6,
      closeToExceed: 6,
      avgOpenTime: 5.2,
      avgEndedTime: 3.1,
      longestRunning: 18.5,
      spentBudget: 45600,
      endedRegular: 68,
      endedWithError: 6,
    };

    return { ...baseStats, userStats, adminStats };
  }, [engines, deployments]);

  // Chart data
  const instanceDistributionData = useMemo(() => {
    if (!stats)
      return [
        { name: 'Completed', value: 22, color: COLORS.blue },
        { name: 'Running', value: 15, color: COLORS.green },
        { name: 'Paused', value: 5, color: COLORS.orange },
        { name: 'Stopped', value: 2, color: COLORS.gray },
        { name: 'Failed', value: 3, color: COLORS.red },
      ];

    const stoppedInstances = Math.max(Math.floor(stats.totalInstances * 0.05), 1); // 5% stopped as placeholder

    return [
      { name: 'Completed', value: Math.max(stats.completedInstances, 1), color: COLORS.blue },
      { name: 'Running', value: stats.runningInstances || 1, color: COLORS.green },
      { name: 'Paused', value: stats.pausedInstances || 1, color: COLORS.orange },
      { name: 'Stopped', value: stoppedInstances, color: COLORS.gray },
      { name: 'Failed', value: stats.failedInstances || 1, color: COLORS.red },
    ];
  }, [stats]);

  const processTimelineData = useMemo(() => {
    if (!stats)
      return [
        { name: 'On Schedule', value: 11, color: COLORS.green },
        { name: 'Close to Exceed', value: 2, color: COLORS.orange },
        { name: 'Exceeded', value: 2, color: COLORS.red },
      ];

    return [
      { name: 'On Schedule', value: stats.userStats.onSchedule, color: COLORS.green },
      { name: 'Close to Exceed', value: stats.userStats.closeToExceed, color: COLORS.orange },
      { name: 'Exceeded', value: stats.userStats.exceededTime, color: COLORS.red },
    ];
  }, [stats]);

  const processOutcomeData = useMemo(() => {
    if (!stats)
      return [
        { name: 'Completed', value: 22, color: COLORS.green },
        { name: 'Failed', value: 3, color: COLORS.red },
      ];

    return [
      { name: 'Completed', value: Math.max(stats.userStats.endedRegular, 1), color: COLORS.green },
      { name: 'Failed', value: stats.userStats.endedWithError || 1, color: COLORS.red },
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

  const successRate =
    stats.totalInstances > 0
      ? ((stats.completedInstances / stats.totalInstances) * 100).toFixed(1)
      : 100;

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

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  const InitiatorContent = (
    <>
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
                <Text type="secondary">Open Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600, color: COLORS.green }}>
                  {stats.userStats.openProcesses}
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
                <Text type="secondary">Ended Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {stats.userStats.endedProcesses}
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
                    stats.userStats.openProcesses > 0
                      ? (stats.userStats.onSchedule / stats.userStats.openProcesses) * 100
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
                    stats.userStats.openProcesses > 0
                      ? (stats.userStats.closeToExceed / stats.userStats.openProcesses) * 100
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
                    stats.userStats.openProcesses > 0
                      ? (stats.userStats.exceededTime / stats.userStats.openProcesses) * 100
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
          <Card title="Process Outcomes" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={processOutcomeData}
                margin={{ top: 20, right: 60, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="value" fill={COLORS.success} radius={[8, 8, 0, 0]}>
                  {processOutcomeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? COLORS.success : COLORS.error}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  dot={{ r: 5 }}
                />
              </ComposedChart>
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
            value={stats.userStats.avgEndedTime}
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

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
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
        <Col xs={24} lg={12}>
          <Card title="Performance Trend" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={performanceTrendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" />
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
                  dataKey="avgTime"
                  stroke={COLORS.blue}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPerf)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Text type="secondary" strong>
                Processes Ended Regular
              </Text>
              <div style={{ fontSize: '32px', fontWeight: 600, color: COLORS.green }}>
                <CheckCircleOutlined style={{ marginRight: '8px' }} />
                {stats.userStats.endedRegular}
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Text type="secondary" strong>
                Processes Ended with Error
              </Text>
              <div style={{ fontSize: '32px', fontWeight: 600, color: COLORS.red }}>
                <CloseCircleOutlined style={{ marginRight: '8px' }} />
                {stats.userStats.endedWithError}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  );

  const ParticipantContent = (
    <>
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
              value={stats.userStats.endedTasks}
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
                        (stats.userStats.endedTasks /
                          (stats.userStats.endedTasks + stats.userStats.openTasks)) *
                        100,
                      fill: COLORS.success,
                    },
                  ]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: '#f0f0f0' }} dataKey="value" cornerRadius={10} />
                  <Tooltip
                    formatter={(value) => (value ? `${Number(value).toFixed(1)}%` : '')}
                  />{' '}
                </RadialBarChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: 'absolute',
                  top: '45%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: COLORS.success }}>
                  {(
                    (stats.userStats.endedTasks /
                      (stats.userStats.endedTasks + stats.userStats.openTasks)) *
                    100
                  ).toFixed(0)}
                  %
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c', marginTop: '4px' }}>
                  {stats.userStats.endedTasks} /{' '}
                  {stats.userStats.endedTasks + stats.userStats.openTasks}
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

  const AdminContent = (
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
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">Accessible Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {stats.adminStats.accessibleProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Executable Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {stats.adminStats.executableProcesses}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">Open Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600, color: COLORS.green }}>
                  {stats.adminStats.openProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Paused Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600, color: COLORS.orange }}>
                  {stats.adminStats.pausedProcesses}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">Ended Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {stats.adminStats.endedProcesses}
                </div>
              </div>
              <div>
                <Text type="secondary">Started Processes</Text>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {stats.adminStats.startedProcesses}
                </div>
              </div>
            </Space>
          </Card>
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
                  <Text strong>{stats.adminStats.onSchedule}</Text>
                </div>
                <Progress
                  percent={
                    stats.adminStats.openProcesses > 0
                      ? (stats.adminStats.onSchedule / stats.adminStats.openProcesses) * 100
                      : 70
                  }
                  strokeColor={COLORS.green}
                  showInfo={true}
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
                    stats.adminStats.openProcesses > 0
                      ? (stats.adminStats.closeToExceed / stats.adminStats.openProcesses) * 100
                      : 15
                  }
                  strokeColor={COLORS.orange}
                  showInfo={true}
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
                    stats.adminStats.openProcesses > 0
                      ? (stats.adminStats.exceededTime / stats.adminStats.openProcesses) * 100
                      : 15
                  }
                  strokeColor={COLORS.red}
                  showInfo={true}
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
            value={stats.adminStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Avg. Completed Time"
            value={stats.adminStats.avgEndedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Longest Running"
            value={stats.adminStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Budget Spent"
            value={stats.adminStats.spentBudget}
            icon={<DollarOutlined />}
            color={COLORS.purple}
            prefix="$"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Text type="secondary" strong>
                Team Processes Ended Regular
              </Text>
              <div style={{ fontSize: '32px', fontWeight: 600, color: COLORS.green }}>
                <CheckCircleOutlined style={{ marginRight: '8px' }} />
                {stats.adminStats.endedRegular}
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Text type="secondary" strong>
                Team Processes Ended with Error
              </Text>
              <div style={{ fontSize: '32px', fontWeight: 600, color: COLORS.red }}>
                <CloseCircleOutlined style={{ marginRight: '8px' }} />
                {stats.adminStats.endedWithError}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  );

  return (
    <div>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
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
      </div>

      <Title level={4} style={{ marginBottom: '16px' }}>
        <DashboardOutlined /> System Overview
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Engines Online"
            value={stats.engines}
            icon={<RocketOutlined />}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Deployed Processes"
            value={stats.deployments}
            icon={<ThunderboltOutlined />}
            color={COLORS.blue}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Instances"
            value={stats.totalInstances}
            icon={<PlayCircleOutlined />}
            color={COLORS.purple}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Success Rate"
            value={parseFloat(successRate as string)}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="%"
            precision={1}
          />
        </Col>
      </Row>

      <Title level={4} style={{ marginBottom: '16px' }}>
        Instance Status
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Running"
            value={stats.runningInstances}
            icon={<PlayCircleOutlined />}
            color={COLORS.green}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Paused"
            value={stats.pausedInstances}
            icon={<PauseCircleOutlined />}
            color={COLORS.orange}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Completed"
            value={stats.completedInstances}
            icon={<CheckCircleOutlined />}
            color={COLORS.blue}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Failed"
            value={stats.failedInstances}
            icon={<CloseCircleOutlined />}
            color={COLORS.red}
          />
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
                <RadialBar background dataKey="value" />
                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                <Tooltip
                  formatter={(value) => (value ? `${Number(value).toFixed(1)}%` : '')}
                />{' '}
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
                          ? '#00A86B'
                          : entry.name === 'Close to Exceed'
                            ? '#FF8C00'
                            : '#DC143C'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'initiator',
            label: (
              <span>
                <UserOutlined /> Your Processes (Initiator)
              </span>
            ),
            children: InitiatorContent,
          },
          {
            key: 'participant',
            label: (
              <span>
                <TeamOutlined /> Your Tasks (Participant)
              </span>
            ),
            children: ParticipantContent,
          },
          {
            key: 'admin',
            label: (
              <span>
                <CrownOutlined /> Admin/Manager Overview
              </span>
            ),
            children: AdminContent,
          },
        ]}
      />
    </div>
  );
};

export default DashboardView;
