import { Card, Statistic, Typography } from 'antd';

const { Text } = Typography;

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  precision?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#1677ff',
  precision = 0,
}) => (
  <Card variant="borderless" style={{ height: '100%' }}>
    <Statistic
      title={<Text type="secondary">{title}</Text>}
      value={value}
      precision={precision}
      prefix={<span style={{ color, fontSize: '20px', marginRight: '8px' }}>{icon}</span>}
      suffix={'hrs'}
      styles={{
        content: {
          fontSize: '24px',
          fontWeight: 600,
        },
      }}
    />
  </Card>
);

export default StatCard;
