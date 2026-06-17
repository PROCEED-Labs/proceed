import { Card, Col, Divider, Row, Tag, Tooltip, Typography } from 'antd';
import {
  CheckOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import styles from './dashboard-charts.module.scss';
import type { calculateUserStats } from '../../app/(dashboard)/[environmentId]/(automation)/executions-dashboard/dashboard-utils';
import { DASHBOARD_COLORS as COLORS } from './dashboard-colors';

const { Text } = Typography;

type UserStats = ReturnType<typeof calculateUserStats>;

interface TaskSummaryCardProps {
  userStats: UserStats;
}

interface TaskSummaryColumnProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  openCount: number;
  completedCount?: number;
  openColor?: 'warning' | 'error';
  span: number;
}

const TaskSummaryColumn: React.FC<TaskSummaryColumnProps> = ({
  icon,
  label,
  tooltip,
  openCount,
  completedCount,
  openColor = 'warning',
  span,
}) => (
  <Col xs={24} sm={24} md={span}>
    <div className={styles.taskSummarySection}>
      {icon}
      <Text strong>{label}</Text>
      <Tooltip title={tooltip}>
        <QuestionCircleOutlined className={styles.taskSummaryHelpIcon} />
      </Tooltip>
    </div>
    <div className={styles.taskSummaryTags}>
      <Tag icon={<ClockCircleOutlined />} color={openColor} className={styles.taskSummaryTag}>
        Open: {openCount}
      </Tag>
      {completedCount !== undefined && (
        <Tag icon={<CheckOutlined />} color="success" className={styles.taskSummaryTag}>
          Completed: {completedCount}
        </Tag>
      )}
    </div>
  </Col>
);

const VerticalDivider = () => (
  <Col xs={0} sm={0} md={1} style={{ display: 'flex', justifyContent: 'center' }}>
    <Divider orientation="vertical" className={styles.taskSummaryDivider} />
  </Col>
);

const TaskSummaryCard: React.FC<TaskSummaryCardProps> = ({ userStats }) => {
  const directSpan = !userStats.isOrganization ? 24 : userStats.isAdmin ? 8 : 11;

  return (
    <Card title="Task Summary" variant="borderless" styles={{ body: { padding: '36px 32px' } }}>
      <Row gutter={[32, 32]} align="middle">
        {/* Directly Assigned */}
        <TaskSummaryColumn
          icon={<UserOutlined style={{ color: COLORS.blue }} className={styles.taskSummaryIcon} />}
          label="Directly Assigned"
          tooltip="Tasks where you are explicitly listed as a potential owner"
          openCount={userStats.yourOpenTasks ?? 0}
          completedCount={userStats.yourCompletedTasks ?? 0}
          span={directSpan}
        />

        {/* Via Role/Group for rganization only */}
        {userStats.isOrganization && (
          <>
            <VerticalDivider />
            <TaskSummaryColumn
              icon={
                <TeamOutlined style={{ color: COLORS.purple }} className={styles.taskSummaryIcon} />
              }
              label="Via Role / Group"
              tooltip="Tasks assigned to a role you belong to, not directly to you"
              openCount={userStats.groupOpenTasks ?? 0}
              completedCount={userStats.groupCompletedTasks ?? 0}
              span={userStats.isAdmin ? 8 : 11}
            />
          </>
        )}
        {/* Unassigned for admin only */}
        {userStats.isAdmin && (
          <>
            <VerticalDivider />
            <TaskSummaryColumn
              icon={
                <QuestionCircleOutlined
                  style={{ color: COLORS.red }}
                  className={styles.taskSummaryIcon}
                />
              }
              label="Unassigned"
              tooltip="Tasks with no specific user or role assigned — admin view only"
              openCount={userStats.unassignedTasks ?? 0}
              openColor="error"
              span={6}
            />
          </>
        )}
      </Row>
    </Card>
  );
};

export default TaskSummaryCard;
