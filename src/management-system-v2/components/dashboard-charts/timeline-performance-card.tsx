import { Card, Space, Typography, Progress, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import styles from './dashboard-charts.module.scss';

const { Text } = Typography;

const COLORS = {
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
};

interface TimelinePerformanceCardProps {
  onSchedule: number;
  closeToExceed: number;
  exceededTime: number;
  onScheduleRunning: number;
  closeToExceedRunning: number;
  exceededTimeRunning: number;
  title?: string;
}

const TimelinePerformanceCard: React.FC<TimelinePerformanceCardProps> = ({
  onSchedule,
  closeToExceed,
  exceededTime,
  onScheduleRunning,
  closeToExceedRunning,
  exceededTimeRunning,
  title = 'Timeline Performance',
}) => {
  // use total running tracked as denominator
  const totalRunningTracked = onScheduleRunning + closeToExceedRunning + exceededTimeRunning;

  return (
    <Card
      title={
        <Space>
          {title}
          <Tooltip
            title={`Progress bars show percentage of currently running or paused processes only. 
              Processes without planned duration configured in their BPMN model are counted as On Schedule by default.`}
          >
            <QuestionCircleOutlined
              style={{ color: '#8c8c8c', fontSize: '14px', cursor: 'pointer' }}
            />
          </Tooltip>
        </Space>
      }
      variant="borderless"
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        <div>
          <div className={styles.timelineRow}>
            <Text>On Schedule</Text>
            <Text strong>Total Processes: {onSchedule}</Text>
          </div>
          <Progress
            percent={totalRunningTracked > 0 ? (onScheduleRunning / totalRunningTracked) * 100 : 0}
            strokeColor={COLORS.green}
            showInfo={true}
            format={(percent) => (
              <span className={styles.timelineProgressInfo}>
                {percent?.toFixed(0)}% (Running or Paused: {onScheduleRunning})
              </span>
            )}
          />
        </div>
        <div>
          <div className={styles.timelineRow}>
            <Text>Close to Exceed (10%)</Text>
            <Text strong>Total Processes: {closeToExceed}</Text>
          </div>
          <Progress
            percent={
              totalRunningTracked > 0 ? (closeToExceedRunning / totalRunningTracked) * 100 : 0
            }
            strokeColor={COLORS.orange}
            showInfo={true}
            format={(percent) => (
              <span className={styles.timelineProgressInfo}>
                {percent?.toFixed(0)}% (Running or Paused: {closeToExceedRunning})
              </span>
            )}
          />
        </div>
        <div>
          <div className={styles.timelineRow}>
            <Text>Exceeded Time</Text>
            <Text strong>Total Processes: {exceededTime}</Text>
          </div>
          <Progress
            percent={
              totalRunningTracked > 0 ? (exceededTimeRunning / totalRunningTracked) * 100 : 0
            }
            strokeColor={COLORS.red}
            showInfo={true}
            format={(percent) => (
              <span className={styles.timelineProgressInfo}>
                {percent?.toFixed(0)}% (Running or Paused: {exceededTimeRunning})
              </span>
            )}
          />
        </div>
      </Space>
    </Card>
  );
};

export default TimelinePerformanceCard;
