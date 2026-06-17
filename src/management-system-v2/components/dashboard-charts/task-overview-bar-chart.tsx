import { Card } from 'antd';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { DASHBOARD_COLORS as COLORS } from './dashboard-colors';


interface TaskOverviewChartProps {
  yourOpenTasks: number;
  yourCompletedTasks: number;
  groupOpenTasks: number;
  groupCompletedTasks: number;
  unassignedTasks?: number;
  isOrganization?: boolean;
}

const TaskOverviewChart: React.FC<TaskOverviewChartProps> = ({
  yourOpenTasks,
  yourCompletedTasks,
  groupOpenTasks,
  groupCompletedTasks,
  unassignedTasks,
  isOrganization = false,
}) => {
  const data = isOrganization
    ? [
        { category: 'Directly Assigned', Open: yourOpenTasks, Completed: yourCompletedTasks },
        { category: 'Via Role / Group', Open: groupOpenTasks, Completed: groupCompletedTasks },
        ...(unassignedTasks !== undefined
          ? [{ category: 'Unassigned', Open: unassignedTasks, Completed: 0 }]
          : []),
      ]
    : [{ category: 'Tasks', Open: yourOpenTasks, Completed: yourCompletedTasks }];

  const barSize = isOrganization ? 30 : 60;

  return (
    <Card title="Task Breakdown" variant="borderless">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Bar dataKey="Open" fill={COLORS.orange} radius={[4, 4, 0, 0]} barSize={barSize} />
          <Bar dataKey="Completed" fill={COLORS.green} radius={[4, 4, 0, 0]} barSize={barSize} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default TaskOverviewChart;
