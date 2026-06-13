import { Card, Space, Typography, Progress } from 'antd';
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
  runningProcesses: number;
  title?: string;
}

const TimelinePerformanceCard: React.FC<TimelinePerformanceCardProps> = ({
  onSchedule,
  closeToExceed,
  exceededTime,
  runningProcesses,
  title = 'Timeline Performance',
}) => {
  return (
    <Card title={title} variant="borderless">
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        <div>
          <div className={styles.timelineRow}>
            <Text>On Schedule</Text>
            <Text strong>{onSchedule}</Text>
          </div>
          <Progress
            percent={runningProcesses > 0 ? (onSchedule / runningProcesses) * 100 : 0}
            strokeColor={COLORS.green}
            showInfo={true}
            format={(percent) => `${percent?.toFixed(0)}%`}
          />
        </div>
        <div>
          <div className={styles.timelineRow}>
            <Text>Close to Exceed (10%)</Text>
            <Text strong>{closeToExceed}</Text>
          </div>
          <Progress
            percent={runningProcesses > 0 ? (closeToExceed / runningProcesses) * 100 : 0}
            strokeColor={COLORS.orange}
            showInfo={true}
            format={(percent) => `${percent?.toFixed(0)}%`}
          />
        </div>
        <div>
          <div className={styles.timelineRow}>
            <Text>Exceeded Time</Text>
            <Text strong>{exceededTime}</Text>
          </div>
          <Progress
            percent={runningProcesses > 0 ? (exceededTime / runningProcesses) * 100 : 0}
            strokeColor={COLORS.red}
            showInfo={true}
            format={(percent) => `${percent?.toFixed(0)}%`}
          />
        </div>
      </Space>
    </Card>
  );
};

export default TimelinePerformanceCard;
