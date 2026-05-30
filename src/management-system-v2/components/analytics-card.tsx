import { Card, Typography, Tooltip, Progress } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LegendItem {
  label: string;
  value: number;
  pattern?: 'solid' | 'striped';
  tooltip?: string;
}

interface AnalyticsCardProps {
  title: string;
  icon: React.ReactNode;
  mainValue: number;
  secondaryValue?: number;
  showProgress?: boolean;
  progressPercent?: number;
  successPercent?: number;
  subtitle: string;
  tooltip?: string;
  legend?: LegendItem[];
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  icon,
  mainValue,
  secondaryValue,
  showProgress = false,
  progressPercent = 0,
  successPercent,
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
      bodyStyle={{ padding: '12px 16px' }}
    >
      {/* Title with optional tooltip */}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Text style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 500 }}>{title}</Text>
        {tooltip && (
          <Tooltip title={tooltip}>
            <QuestionCircleOutlined
              style={{ color: '#bfbfbf', fontSize: '12px', cursor: 'help' }}
            />
          </Tooltip>
        )}
      </div>

      {/* Main value with icon */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ color: '#1677ff', fontSize: '18px' }}>{icon}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ color: '#1677ff', fontSize: '24px', fontWeight: 600, lineHeight: 1 }}>
              {mainValue}
            </span>
            {secondaryValue !== undefined && (
              <span style={{ color: '#8c8c8c', fontSize: '16px', fontWeight: 400 }}>
                / {secondaryValue}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div style={{ marginBottom: legend ? '6px' : '8px' }}>
          <div
            style={{
              display: 'flex',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: '#f0f0f0',
              overflow: 'hidden',
            }}
          >
            {/* First segment: Solid dark gray */}
            {successPercent !== undefined && successPercent > 0 && (
              <div
                style={{
                  width: `${successPercent}%`,
                  backgroundColor: '#595959',
                  transition: 'width 0.3s ease',
                }}
              />
            )}
            {/* Second segment: Striped pattern */}
            {progressPercent > (successPercent || 0) && (
              <div
                style={{
                  width: `${progressPercent - (successPercent || 0)}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #a6a6a6, #a6a6a6 2px, #bfbfbf 2px, #bfbfbf 4px)',
                  transition: 'width 0.3s ease',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {legend && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '6px 12px',
            fontSize: '11px',
            marginBottom: '6px',
          }}
        >
          {legend.map((item, index) => (
            <Tooltip title={item.tooltip} key={index}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: item.tooltip ? 'help' : 'default',
                }}
              >
                {/* Pattern indicator: solid for first, striped for second */}
                <div
                  style={{
                    width: '12px',
                    height: '8px',
                    borderRadius: '2px',
                    background:
                      index === 0
                        ? '#595959'
                        : 'repeating-linear-gradient(45deg, #a6a6a6, #a6a6a6 2px, #bfbfbf 2px, #bfbfbf 4px)',
                  }}
                />
                <Text style={{ color: '#595959', fontSize: '11px' }}>
                  {item.label}: {item.value}
                </Text>
              </div>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Subtitle */}
      <div>
        <Text style={{ color: '#aaa9a9ff', fontSize: '11px' }}>{subtitle}</Text>
      </div>
    </Card>
  );
};

export default AnalyticsCard;
