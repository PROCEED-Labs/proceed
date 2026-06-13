import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from './dashboard-charts.module.scss';

const { Text } = Typography;

const COLORS = {
  blue: '#1677ff',
  orange: '#fa8c16',
  red: '#f5222d',
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
    <Card title={title} variant="borderless">
      <div className={styles.budgetPadding}>
        <Row gutter={16} className={styles.budgetRow}>
          <Col span={8}>
            <div className={styles.budgetColCenter}>
              <Text type="secondary" className={styles.budgetLabel}>
                Planned
              </Text>
              <div className={styles.budgetValuePlanned}>${plannedBudget.toLocaleString()}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className={styles.budgetColCenter}>
              <Text type="secondary" className={styles.budgetLabel}>
                Spent
              </Text>
              <div
                className={`${styles.budgetValueSpent} ${isOverBudget ? styles.budgetValueSpentOver : styles.budgetValueSpentNormal}`}
              >
                ${spentBudget.toLocaleString()}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div className={styles.budgetColCenter}>
              <Text type="secondary" className={styles.budgetLabel}>
                {isOverBudget ? 'Over Budget' : 'Remaining'}
              </Text>
              <div
                className={`${styles.budgetValueRemaining} ${isOverBudget ? styles.budgetValueRemainingOver : styles.budgetValueRemainingNormal}`}
              >
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
                exceeded: isOverBudget ? spentBudget - plannedBudget : 0,
              },
            ]}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" hide />
            <Tooltip
              formatter={(value) => `$${Number(value).toLocaleString()}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Bar
              dataKey="planned"
              stackId="a"
              fill={COLORS.blue}
              name="Planned Budget"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="spent"
              stackId="b"
              fill={COLORS.orange}
              name="Spent (Within Budget)"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="exceeded"
              stackId="b"
              fill={COLORS.red}
              name="Exceeded"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default BudgetOverviewChart;
