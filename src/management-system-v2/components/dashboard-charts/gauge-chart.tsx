import { Card } from 'antd';
import { RadialBarChart, RadialBar, PolarAngleAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
  percentage: number;
  completed: number;
  total: number;
  title: string;
  color?: string;
}

const GaugeChart: React.FC<GaugeChartProps> = ({
  percentage,
  completed,
  total,
  title,
  color = '#52c41a',
}) => {
  return (
    <Card title={title} bordered={false}>
      <div style={{ position: 'relative', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            barSize={30}
            data={[
              {
                name: 'Completion',
                value: percentage,
                fill: color,
              },
            ]}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#f0f0f0' }} dataKey="value" cornerRadius={10} />
            <Tooltip formatter={(value) => (value ? `${Number(value).toFixed(1)}%` : '')} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '48px', fontWeight: 'bold', color, lineHeight: 1 }}>
            {percentage.toFixed(0)}%
          </div>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginTop: '8px' }}>
            {completed} / {total} Tasks
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GaugeChart;
