import { Card, Col, Divider, Row, Tag, Tooltip, Typography } from 'antd';
import {
  CheckOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import styles from './dashboard-charts.module.scss';

const { Text } = Typography;

const COLORS = {
  blue: '#1677ff',
  red: '#f5222d',
  purple: '#722ed1',
};

interface TaskSummaryCardProps {
  userStats: any;
}

const TaskSummaryCard: React.FC<TaskSummaryCardProps> = ({ userStats }) => {
  return (
    <Card title="Task Summary" variant="borderless" styles={{ body: { padding: '36px 32px' } }}>
      <Row gutter={[32, 32]} align="middle">
        {/* Directly Assigned */}
        <Col xs={24} sm={24} md={!userStats.isOrganization ? 24 : userStats.isAdmin ? 8 : 11}>
          <div className={styles.taskSummarySection}>
            <UserOutlined style={{ color: COLORS.blue }} className={styles.taskSummaryIcon} />
            <Text strong>Directly Assigned</Text>
            <Tooltip title="Tasks where you are explicitly listed as a potential owner">
              <QuestionCircleOutlined className={styles.taskSummaryHelpIcon} />
            </Tooltip>
          </div>
          <div className={styles.taskSummaryTags}>
            <Tag icon={<ClockCircleOutlined />} color="warning" className={styles.taskSummaryTag}>
              Open: {userStats.yourOpenTasks ?? 0}
            </Tag>
            <Tag icon={<CheckOutlined />} color="success" className={styles.taskSummaryTag}>
              Completed: {userStats.yourCompletedTasks ?? 0}
            </Tag>
          </div>
        </Col>

        {/* Via Role/Group for rganization only */}
        {userStats.isOrganization && (
          <>
            <Col xs={0} sm={0} md={1} style={{ display: 'flex', justifyContent: 'center' }}>
              <Divider orientation="vertical" className={styles.taskSummaryDivider} />
            </Col>
            <Col xs={24} sm={24} md={userStats.isAdmin ? 8 : 11}>
              <div className={styles.taskSummarySection}>
                <TeamOutlined style={{ color: COLORS.purple }} className={styles.taskSummaryIcon} />
                <Text strong>Via Role / Group</Text>
                <Tooltip title="Tasks assigned to a role you belong to, not directly to you">
                  <QuestionCircleOutlined className={styles.taskSummaryHelpIcon} />
                </Tooltip>
              </div>
              <div className={styles.taskSummaryTags}>
                <Tag
                  icon={<ClockCircleOutlined />}
                  color="warning"
                  className={styles.taskSummaryTag}
                >
                  Open: {userStats.groupOpenTasks ?? 0}
                </Tag>
                <Tag icon={<CheckOutlined />} color="success" className={styles.taskSummaryTag}>
                  Completed: {userStats.groupCompletedTasks ?? 0}
                </Tag>
              </div>
            </Col>
          </>
        )}
        {/* Unassigned for admin only */}
        {userStats.isAdmin && (
          <>
            <Col xs={0} sm={0} md={1} style={{ display: 'flex', justifyContent: 'center' }}>
              <Divider orientation="vertical" className={styles.taskSummaryDivider} />
            </Col>
            <Col xs={24} sm={24} md={6}>
              <div className={styles.taskSummarySection}>
                <QuestionCircleOutlined
                  style={{ color: COLORS.red }}
                  className={styles.taskSummaryIcon}
                />
                <Text strong>Unassigned</Text>
                <Tooltip title="Tasks with no specific user or role assigned — admin view only">
                  <QuestionCircleOutlined className={styles.taskSummaryHelpIcon} />
                </Tooltip>
              </div>
              <div className={styles.taskSummaryTags}>
                <Tag icon={<ClockCircleOutlined />} color="error" className={styles.taskSummaryTag}>
                  Open: {userStats.unassignedTasks ?? 0}
                </Tag>
              </div>
            </Col>
          </>
        )}
      </Row>
    </Card>
  );
};

export default TaskSummaryCard;
