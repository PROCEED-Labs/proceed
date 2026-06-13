import React from 'react';
import { Card } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  success: '#52c41a',
  error: '#f5222d',
  blue: '#1677ff',
  purple: '#722ed1',
};

interface ProcessActivityChartProps {
  title: string;
  data: any[];
  dataKeys?: {
    x: string;
    line1: { key: string; name: string; color?: string };
    line2?: { key: string; name: string; color?: string };
  };
}

const ProcessActivityChart: React.FC<ProcessActivityChartProps> = ({
  title,
  data,
  dataKeys = {
    x: 'month',
    line1: { key: 'completed', name: 'completed', color: COLORS.success },
    line2: { key: 'failed', name: 'failed', color: COLORS.error },
  },
}) => {
  return (
    <Card title={title} variant="borderless">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={dataKeys.x} />
          <YAxis />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={dataKeys.line1.key}
            stroke={dataKeys.line1.color || COLORS.success}
            strokeWidth={3}
            dot={{ r: 5 }}
            name={dataKeys.line1.name}
          />
          {dataKeys.line2 && (
            <Line
              type="monotone"
              dataKey={dataKeys.line2.key}
              stroke={dataKeys.line2.color || COLORS.error}
              strokeWidth={3}
              dot={{ r: 5 }}
              name={dataKeys.line2.name}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default ProcessActivityChart;
