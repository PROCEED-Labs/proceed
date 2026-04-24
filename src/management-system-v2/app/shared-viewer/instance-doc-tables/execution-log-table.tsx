import React from 'react';
import { Alert, Table } from 'antd';
import { InstanceInfo } from '@/lib/engines/deployment';
import { generateDateString, generateDurationString } from '@/lib/utils';
import { statusToType } from '@/app/(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-helpers';

type LogRow = {
  key: string;
  executionState: string;
  startTime?: number | string;
  endTime?: number | string;
  duration?: string;
  machine?: InstanceInfo['log'][number]['machine'];
};

const columns = [
  {
    title: 'State',
    dataIndex: 'executionState',
    key: 'executionState',
    width: 160,
    render: (state: string) => (
      <Alert
        style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}
        type={statusToType(state)}
        message={state}
        showIcon
      />
    ),
  },
  {
    title: 'Started',
    dataIndex: 'startTime',
    key: 'startTime',
    render: (t?: number | string) =>
      typeof t === 'number' ? generateDateString(new Date(t), true) : t ?? '—',
  },
  {
    title: 'Ended',
    dataIndex: 'endTime',
    key: 'endTime',
    render: (t?: number | string) =>
      typeof t === 'number' ? generateDateString(new Date(t), true) : t ?? '—',
  },
  {
    title: 'Duration',
    key: 'duration',
    render: (_: any, row: LogRow) => {
      const duration =
        typeof row.endTime === 'number' && typeof row.startTime === 'number'
          ? row.endTime - row.startTime
          : undefined;
      return duration !== undefined ? generateDurationString(duration) : '—';
    },
  },
  {
    title: 'Machine',
    dataIndex: 'machine',
    key: 'machine',
    width: 150,
    render: (m?: InstanceInfo['log'][number]['machine']) => (m ? m.name : '—'),
  },
];

const notStartedRow: LogRow[] = [
  {
    key: 'not-started',
    executionState: 'Not yet started',
    startTime: '—',
    endTime: '—',
    duration: '—',
    machine: undefined,
  },
];

type ExecutionLogTableProps = {
  rows: LogRow[];
};

const ExecutionLogTable: React.FC<ExecutionLogTableProps> = ({ rows }) => (
  <Table
    pagination={false}
    rowKey="key"
    columns={columns}
    dataSource={rows.length > 0 ? rows : notStartedRow}
  />
);

export default ExecutionLogTable;
