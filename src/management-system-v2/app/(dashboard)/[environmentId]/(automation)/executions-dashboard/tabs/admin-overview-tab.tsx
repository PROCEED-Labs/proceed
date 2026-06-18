'use client';

import { Col, Row, Typography, TreeSelect } from 'antd';
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
import { FolderTreeNode } from '../dashboard-view';
import styles from '../dashboard-tabs.module.scss';
import { DASHBOARD_COLORS as COLORS } from '@/components/dashboard-charts/dashboard-colors';
import type { calculateManagerStats } from '../dashboard-utils';

const { Title, Text } = Typography;

type AdminStats = ReturnType<typeof calculateManagerStats> & { engines: number };

interface DistributionDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface AdminOverviewTabProps {
  adminStats: AdminStats;
  instanceDistributionData: DistributionDataPoint[];
  monthlyData: { month: string; completed: number; failed: number }[];
  folderTree: FolderTreeNode | null;
  selectedFolderId: string | null;
  onFolderChange: (folderId: string | null) => void;
}

const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  adminStats,
  instanceDistributionData,
  monthlyData,
  folderTree,
  selectedFolderId,
  onFolderChange,
}) => {
  return (
    <>
      {/* Folder Selector */}
      <div className={styles.folderSelector}>
        <FolderOutlined className={styles.folderIcon} />
        <Text strong>System Folder:</Text>
        <TreeSelect
          value={selectedFolderId ?? folderTree?.value}
          onChange={(val) => onFolderChange(val)}
          treeData={folderTree ? [folderTree] : []}
          className={styles.treeSelectWidth}
          placeholder="Select folder"
          allowClear
          onClear={() => onFolderChange(null)}
          treeDefaultExpandAll
        />
      </div>

      {/* System Overview Section */}
      <Title level={4} className={styles.sectionTitle}>
        <HiShieldCheck className={styles.iconMarginRight} /> System Overview
      </Title>

      <Row gutter={[16, 16]} className={styles.statsRowWrap}>
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
          <Col key={index} flex="1 1 20%" className={styles.statColMinWidth}>
            <StatCard title={item.title} value={item.value} icon={item.icon} color={item.color} />
          </Col>
        ))}
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]} className={styles.rowMarginBottom}>
        <Col xs={24} lg={12}>
          <RadialDistributionChart
            title="System Instance Distribution"
            data={instanceDistributionData}
          />
        </Col>
        <Col xs={24} lg={12}>
          <TimelinePerformanceCard
            title="System Timeline Performance"
            onSchedule={adminStats.onSchedule}
            closeToExceed={adminStats.closeToExceed}
            exceededTime={adminStats.exceededTime}
            onScheduleRunning={adminStats.onScheduleRunning}
            closeToExceedRunning={adminStats.closeToExceedRunning}
            exceededTimeRunning={adminStats.exceededTimeRunning}
          />
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]} className={styles.rowMarginBottom}>
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
            plannedBudget={adminStats.plannedBudget}
            spentBudget={adminStats.spentBudget}
          />
        </Col>
      </Row>

      {/* Stats Row */}
      <Row gutter={[16, 16]} className={styles.rowMarginBottom}>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="System Avg. Open Time"
            value={adminStats.avgOpenTime}
            icon={<ClockCircleOutlined />}
            color={COLORS.blue}
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="System Avg. Completed"
            value={adminStats.avgCompletedTime}
            icon={<CheckCircleOutlined />}
            color={COLORS.green}
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Longest Running Process"
            value={adminStats.longestRunning}
            icon={<HourglassOutlined />}
            color={COLORS.red}
            precision={1}
          />
        </Col>
      </Row>
    </>
  );
};

export default AdminOverviewTab;
