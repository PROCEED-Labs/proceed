import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Text } = Typography;

const COLORS = {
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  error: '#f5222d',
};

interface BudgetOverviewChartProps {
  title?: string;
  plannedBudget: number;
  spentBudget: number;
}

const BudgetOverviewChart: React.FC<BudgetOverviewChartProps> = ({
  title = 'Budget Overview',
  plannedBudget,
  spentBudget,
}) => {
  const isOverBudget = spentBudget > plannedBudget;
  const remaining = plannedBudget - spentBudget;

  return (
    <Card title={title} bordered={false}>
      <div style={{ padding: '20px 10px' }}>
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Planned</Text>
              <div style={{ fontSize: '24px', fontWeight: 600, color: COLORS.blue }}>
                ${plannedBudget.toLocaleString()}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Spent</Text>
              <div style={{ fontSize: '24px', fontWeight: 600, color: isOverBudget ? COLORS.error : COLORS.orange }}>
                ${spentBudget.toLocaleString()}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {isOverBudget ? 'Over Budget' : 'Remaining'}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 600, color: isOverBudget ? COLORS.error : COLORS.green }}>
                {isOverBudget ? '+' : ''}${Math.abs(remaining).toLocaleString()}
              </div>
            </div>
          </Col>
        </Row>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart 
            data={[
              { 
                name: 'Budget',
                planned: plannedBudget,
                spent: Math.min(spentBudget, plannedBudget),
                exceeded: isOverBudget ? spentBudget - plannedBudget : 0
              }
            ]}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" hide />
            <Tooltip 
              formatter={(value) => `$${Number(value).toLocaleString()}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '6px' }}
            />
            <Legend />
            <Bar dataKey="planned" stackId="a" fill={COLORS.blue} name="Planned Budget" radius={[0, 4, 4, 0]} />
            <Bar dataKey="spent" stackId="b" fill={COLORS.orange} name="Spent (Within Budget)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="exceeded" stackId="b" fill={COLORS.error} name="Exceeded" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default BudgetOverviewChart;