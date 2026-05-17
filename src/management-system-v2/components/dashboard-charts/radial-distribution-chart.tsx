import { Card } from 'antd';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
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
  return (
    <Card title={title} bordered={false}>
      <ResponsiveContainer width="100%" height={280}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="80%"
          barSize={16}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" />
          <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
          <Tooltip formatter={(value) => (value ? `${Number(value).toFixed(1)}%` : '')} />
        </RadialBarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default RadialDistributionChart;
