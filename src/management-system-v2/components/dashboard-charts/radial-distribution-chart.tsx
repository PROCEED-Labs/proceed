import { Card } from 'antd';
import {
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';

interface RadialDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
  title: string;
}

const RadialDistributionChart: React.FC<RadialDistributionChartProps> = ({ data, title }) => {
  // calculate total from raw counts
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const chartData = data.map((d) => ({
    ...d,
    count: d.value,
    value: total > 0 ? parseFloat(((d.value / total) * 100).toFixed(1)) : 0,
  }));

  return (
    <Card title={title} bordered={false}>
      <ResponsiveContainer width="100%" height={280}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="80%"
          barSize={14}
          data={chartData}
        >
          {/* domain [0,100] ensures bar fill is proportional to percentage */}
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" angleAxisId={0} />
          <Legend
            iconSize={10}
            layout="vertical"
            verticalAlign="middle"
            align="right"
            formatter={(value) => value}
            wrapperStyle={{
              top: '50%',
              right: 0,
              transform: 'translate(0, -50%)',
              lineHeight: '24px',
            }}
          />
          <Tooltip
            formatter={(count: any, value: any, props: any) => [
              `${props.payload.count} instances (${props.payload.value}%)`,
              props.payload.name,
            ]}
            labelFormatter={() => ''}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default RadialDistributionChart;
