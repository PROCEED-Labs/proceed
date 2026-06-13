import { Card } from 'antd';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Cell,
  BarChart,
} from 'recharts';

const COLORS = {
  orange: '#fa8c16',
  green: '#52c41a',
};

interface TaskOverviewChartProps {
  openTasks: number;
  completedTasks: number;
}

const TaskOverviewChart: React.FC<TaskOverviewChartProps> = ({ openTasks, completedTasks }) => {
  return (
    <Card title="Task Overview" variant="borderless">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={[
            { label: 'Open', value: openTasks, fill: COLORS.orange },
            { label: 'Completed', value: completedTasks, fill: COLORS.green },
          ]}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
            }}
          />
          <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]} barSize={80}>
            {[
              { label: 'Open', fill: COLORS.orange },
              { label: 'Completed', fill: COLORS.green },
            ].map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default TaskOverviewChart;
