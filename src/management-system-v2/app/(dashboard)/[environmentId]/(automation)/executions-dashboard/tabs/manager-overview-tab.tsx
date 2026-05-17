'use client';

import { useState } from 'react';
import { Card, Col, Row, Space, Typography, TreeSelect } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  DollarOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { MdPlayArrow, MdCheckCircle, MdPause } from 'react-icons/md';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import TimelinePerformanceCard from '@/components/dashboard-charts/timeline-performance-card';
import StatCard from '@/components/stat-card';

const { Text } = Typography;

const COLORS = {
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#f5222d',
  purple: '#722ed1',
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
};

interface ManagerOverviewTabProps {
  managerStats: any;
}

const ManagerOverviewTab: React.FC<ManagerOverviewTabProps> = ({ managerStats }) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('root');

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

  const monthlyData = [
    { month: 'Jan', completed: 45, failed: 3 },
    { month: 'Feb', completed: 52, failed: 2 },
    { month: 'Mar', completed: 48, failed: 4 },
    { month: 'Apr', completed: 58, failed: 2 },
    { month: 'May', completed: 68, failed: 6 },
  ];

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
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

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <TimelinePerformanceCard
            title="Team Timeline Performance"
            onSchedule={managerStats.onSchedule}
            closeToExceed={managerStats.closeToExceed}
            exceededTime={managerStats.exceededTime}
            runningProcesses={managerStats.runningProcesses}
          />
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Team Process Activity" bordered={false}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            value={managerStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Avg. Completed Time"
            value={managerStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Longest Running"
            value={managerStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.error}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Team Budget Spent"
            value={managerStats.spentBudget}
            icon={<DollarOutlined />}
            color={COLORS.purple}
            prefix="$"
          />
        </Col>
      </Row>
    </>
  );
};

export default ManagerOverviewTab;
