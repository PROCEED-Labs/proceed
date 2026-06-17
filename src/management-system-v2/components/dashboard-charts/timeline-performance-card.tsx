import { Card, Space, Typography, Progress, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import styles from './dashboard-charts.module.scss';
import { DASHBOARD_COLORS as COLORS } from './dashboard-colors';

const { Text } = Typography;

interface TimelineRowProps {
  label: string;
  total: number;
  running: number;
  totalRunningTracked: number;
  color: string;
}

const TimelineRow: React.FC<TimelineRowProps> = ({
  label,
  total,
  running,
  totalRunningTracked,
  color,
}) => (
  <div>
    <div className={styles.timelineRow}>
      <Text>{label}</Text>
      <Text strong>Total Processes: {total}</Text>
    </div>
    <Progress
      percent={totalRunningTracked > 0 ? (running / totalRunningTracked) * 100 : 0}
      strokeColor={color}
      showInfo={true}
      format={(percent) => (
        <span className={styles.timelineProgressInfo}>
          {percent?.toFixed(0)}% (Running or Paused: {running})
        </span>
      )}
    />
  </div>
);

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
        <TimelineRow
          label="On Schedule"
          total={onSchedule}
          running={onScheduleRunning}
          totalRunningTracked={totalRunningTracked}
          color={COLORS.green}
        />
        <TimelineRow
          label="Close to Exceed (10%)"
          total={closeToExceed}
          running={closeToExceedRunning}
          totalRunningTracked={totalRunningTracked}
          color={COLORS.orange}
        />
        <TimelineRow
          label="Exceeded Time"
          total={exceededTime}
          running={exceededTimeRunning}
          totalRunningTracked={totalRunningTracked}
          color={COLORS.red}
        />
      </Space>
    </Card>
  );
};

export default TimelinePerformanceCard;
