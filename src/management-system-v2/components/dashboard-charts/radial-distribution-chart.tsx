import { Card } from 'antd';
import { RadialBarChart, RadialBar, Legend, Tooltip, ResponsiveContainer } from 'recharts';

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
          barSize={14}
          data={data}
        >
          <RadialBar background dataKey="value" />
          <Legend
            iconSize={10}
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{
              top: '50%',
              right: 0,
              transform: 'translate(0, -50%)',
              lineHeight: '24px',
            }}
          />
          <Tooltip
            formatter={(value) => (value ? `${Number(value).toFixed(1)}%` : '')}
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
