import { Card } from 'antd';
import { RadialBarChart, RadialBar, PolarAngleAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './dashboard-charts.module.scss';

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
    <Card title={title} variant="borderless">
      <div className={styles.gaugeWrapper}>
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
        <div className={styles.gaugeCenter}>
          <div className={styles.gaugePercentage} style={{ color }}>
            {percentage.toFixed(0)}%
          </div>
          <div className={styles.gaugeSubtext}>
            {completed} / {total} Tasks
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GaugeChart;
