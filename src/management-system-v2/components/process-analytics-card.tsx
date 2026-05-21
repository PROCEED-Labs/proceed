import { Card, Typography, Tooltip, Progress } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LegendItem {
  color: string;
  label: string;
  value: number;
}

interface AnalyticsCardProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  mainValue: number;
  secondaryValue?: number;
  showProgress?: boolean;
  progressPercent?: number;
  progressColor?: string;
  successPercent?: number;
  successColor?: string;
  subtitle: string;
  tooltip?: string;
  legend?: LegendItem[];
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  icon,
  iconColor,
  mainValue,
  secondaryValue,
  showProgress = false,
  progressPercent = 0,
  progressColor = '#1890ff',
  successPercent,
  successColor,
  subtitle,
  tooltip,
  legend,
}) => {
  return (
    <Card
      bordered={false}
      style={{
        flex: '1 1 280px',
        minWidth: '168px',
        maxWidth: '100%',
        boxShadow:
          '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
      }}
      bodyStyle={{ padding: '24px' }}
    >
      {/* Title with optional tooltip */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Text style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>{title}</Text>
        {tooltip && (
          <Tooltip title={tooltip}>
            <QuestionCircleOutlined
              style={{ color: '#bfbfbf', fontSize: '14px', cursor: 'help' }}
            />
          </Tooltip>
        )}
      </div>

      {/* Main value with icon */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: iconColor, fontSize: '24px' }}>{icon}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ color: iconColor, fontSize: '32px', fontWeight: 600, lineHeight: 1 }}>
              {mainValue}
            </span>
            {secondaryValue !== undefined && (
              <span style={{ color: '#bfbfbf', fontSize: '20px', fontWeight: 400 }}>
                / {secondaryValue}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div style={{ marginBottom: legend ? '8px' : '12px' }}>
          <Progress
            percent={progressPercent}
            success={
              successPercent !== undefined
                ? {
                    percent: successPercent,
                    strokeColor: successColor,
                  }
                : undefined
            }
            strokeColor={progressColor}
            trailColor="#f0f0f0"
            showInfo={false}
            strokeWidth={8}
          />
        </div>
      )}

      {/* Legend */}
      {legend && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '12px',
            marginBottom: '8px',
          }}
        >
          {legend.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  background: item.color,
                }}
              />
              <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                {item.label}: {item.value}
              </Text>
            </div>
          ))}
        </div>
      )}

      {/* Subtitle */}
      <div style={{ marginTop: legend ? '0' : '0' }}>
        <Text style={{ color: '#bfbfbf', fontSize: '13px' }}>{subtitle}</Text>
      </div>
    </Card>
  );
};

export default AnalyticsCard;
