import React from 'react';
import { Table } from 'antd';
import { InstanceInfo } from '@/lib/engines/deployment';
import { generateDateString } from '@/lib/utils';

type VariableEntry = { value: unknown; log?: { changedTime: number; changedBy?: string }[] };

type FinalVariablesTableProps = {
  instance: InstanceInfo;
};

const FinalVariablesTable: React.FC<FinalVariablesTableProps> = ({ instance }) => {
  const rawVariables = (instance.variables || {}) as Record<string, VariableEntry>;

  const rows = Object.entries(rawVariables).map(([name, data]) => ({
    name,
    value:
      data.value === null || data.value === undefined
        ? '—'
        : typeof data.value === 'object'
          ? JSON.stringify(data.value)
          : String(data.value),
    lastChanged: data.log?.at(-1)?.changedTime,
  }));

  if (!rows.length) return null;

  return (
    <Table
      pagination={false}
      rowKey="name"
      columns={[
        { title: 'Variable', dataIndex: 'name', key: 'name' },
        { title: 'Final Value', dataIndex: 'value', key: 'value' },
        {
          title: 'Last Changed',
          dataIndex: 'lastChanged',
          key: 'lastChanged',
          render: (t?: number) => (t ? generateDateString(new Date(t), true) : '—'),
        },
      ]}
      dataSource={rows}
    />
  );
};

export default FinalVariablesTable;
