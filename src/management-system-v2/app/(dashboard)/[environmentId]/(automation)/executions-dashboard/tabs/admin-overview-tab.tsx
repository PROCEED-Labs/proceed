'use client';

import { useState } from 'react';
import { Card, Col, Row, Typography, Statistic, Progress, TreeSelect } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { MdRocket, MdPlayArrow, MdCheckCircle, MdPause } from 'react-icons/md';
import { HiShieldCheck } from 'react-icons/hi';
import RadialDistributionChart from '@/components/dashboard-charts/radial-distribution-chart';
import TimelinePerformanceCard from '@/components/dashboard-charts/timeline-performance-card';
import StatCard from '@/components/stat-card';
import BudgetOverviewChart from '@/components/dashboard-charts/budget-overview-chart';
import ProcessActivityChart from '@/components/dashboard-charts/process-activity-chart';

const { Title, Text } = Typography;

const COLORS = {
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
    { month: 'Jan', completed: 145, failed: 8 },
    { month: 'Feb', completed: 162, failed: 5 },
    { month: 'Mar', completed: 158, failed: 12 },
    { month: 'Apr', completed: 178, failed: 7 },
    { month: 'May', completed: 198, failed: 15 },
  ];

  return (
    <>
      {/* Folder Selector */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FolderOutlined style={{ fontSize: '18px', color: COLORS.blue }} />
        <Text strong>System Folder:</Text>
        <TreeSelect
          value={selectedFolder}
          onChange={setSelectedFolder}
          treeData={folderTreeData}
          style={{ width: 250 }}
          placeholder="Select folder"
        />
      </div>

      {/* System Overview Section */}
      <Title level={4} style={{ marginBottom: '16px' }}>
        <HiShieldCheck style={{ marginRight: '8px' }} /> System Overview
      </Title>

      <Row
        gutter={[16, 16]}
        style={{
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
        }}
      >
        {[
          {
            title: 'Engines Online',
            value: adminStats.engines,
            icon: <MdRocket />,
            color: COLORS.green,
          },
          {
            title: 'Running Processes',
            value: adminStats.runningProcesses,
            icon: <MdPlayArrow />,
            color: COLORS.green,
          },
          {
            title: 'Paused Processes',
            value: adminStats.pausedProcesses,
            icon: <MdPause />,
            color: COLORS.orange,
          },
          {
            title: 'Completed Processes',
            value: adminStats.completedProcesses,
            icon: <MdCheckCircle />,
            color: COLORS.blue,
          },
          {
            title: 'Total Processes',
            value: adminStats.startedProcesses,
            icon: <MdRocket />,
            color: COLORS.purple,
          },
        ].map((item, index) => (
          <Col
            key={index}
            flex="1 1 20%"
            style={{
              minWidth: '220px',
            }}
          >
            <StatCard title={item.title} value={item.value} icon={item.icon} color={item.color} />
          </Col>
        ))}
      </Row>

      {/* Charts Row 1 */}
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
            title="System Timeline Performance"
            onSchedule={adminStats.onSchedule}
            closeToExceed={adminStats.closeToExceed}
            exceededTime={adminStats.exceededTime}
            runningProcesses={adminStats.runningProcesses}
          />
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <ProcessActivityChart
            title="System Process Activity"
            data={monthlyData}
            dataKeys={{
              x: 'month',
              line1: { key: 'completed', name: 'Completed', color: COLORS.green },
              line2: { key: 'failed', name: 'Failed', color: COLORS.red },
            }}
          />
        </Col>
        <Col xs={24} lg={12}>
          <BudgetOverviewChart
            title="System Budget Overview"
            plannedBudget={120000}
            spentBudget={adminStats.spentBudget}
          />
        </Col>
      </Row>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="System Avg. Open Time"
            value={adminStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="System Avg. Completed"
            value={adminStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            suffix="hrs"
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Longest Running Process"
            value={adminStats.longestRunning}
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

export default AdminOverviewTab;
