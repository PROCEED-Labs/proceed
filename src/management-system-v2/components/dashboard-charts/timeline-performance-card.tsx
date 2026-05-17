import { Card, Space, Typography, Progress } from 'antd';

const { Text } = Typography;

const COLORS = {
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#f5222d',
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
    <Card title={title} bordered={false}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Text>On Schedule</Text>
            <Text strong>{onSchedule}</Text>
          </div>
          <Progress
            percent={runningProcesses > 0 ? (onSchedule / runningProcesses) * 100 : 0}
            strokeColor={COLORS.success}
            showInfo={true}
            format={(percent) => `${percent?.toFixed(0)}%`}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Text>Close to Exceed (10%)</Text>
            <Text strong>{closeToExceed}</Text>
          </div>
          <Progress
            percent={runningProcesses > 0 ? (closeToExceed / runningProcesses) * 100 : 0}
            strokeColor={COLORS.warning}
            showInfo={true}
            format={(percent) => `${percent?.toFixed(0)}%`}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Text>Exceeded Time</Text>
            <Text strong>{exceededTime}</Text>
          </div>
          <Progress
            percent={runningProcesses > 0 ? (exceededTime / runningProcesses) * 100 : 0}
            strokeColor={COLORS.error}
            showInfo={true}
            format={(percent) => `${percent?.toFixed(0)}%`}
          />
        </div>
      </Space>
    </Card>
  );
};

export default TimelinePerformanceCard;
