import React from 'react';
import { Table } from 'antd';
import { InstanceInfo } from '@/lib/engines/deployment';
import { generateDateString } from '@/lib/utils';
import { ElementInfo } from '@/app/shared-viewer/table-of-content';
import { getElementTypeLabel } from '@/app/shared-viewer/documentation-page-utils';

type VariableLogEntry = {
  changedTime: number;
  changedBy?: string;
  newValue?: unknown;
  oldValue?: unknown;
};

type VariableEntry = {
  value: unknown;
  log?: VariableLogEntry[];
};

type FinalVariablesTableProps = {
  instance: InstanceInfo;
  processHierarchy?: ElementInfo;
};

const FinalVariablesTable: React.FC<FinalVariablesTableProps> = ({
  instance,
  processHierarchy,
}) => {
  const rawVariables = (instance.variables || {}) as Record<string, VariableEntry>;

  // Build a flat map of all elements for quick lookup
  function buildElementMap(
    node: ElementInfo,
    map: Map<string, ElementInfo> = new Map(),
  ): Map<string, ElementInfo> {
    map.set(node.id, node);
    node.children?.forEach((child) => buildElementMap(child, map));
    return map;
  }
  const elementMap = processHierarchy
    ? buildElementMap(processHierarchy)
    : new Map<string, ElementInfo>();

  const resolveElementLabel = (id?: string): string => {
    if (!id) return '—';
    const node = elementMap.get(id);
    return node ? getElementTypeLabel(node) : id;
  };
  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const rows = Object.entries(rawVariables).map(([name, data]) => {
    const lastLog = data.log?.at(-1);
    return {
      name,
      value: formatValue(data.value),
      lastChangedBy: resolveElementLabel(lastLog?.changedBy),
      lastChanged: lastLog?.changedTime,
    };
  });

  if (!rows.length) return null;

  return (
    <Table
      pagination={false}
      rowKey="name"
      columns={[
        { title: 'Variable', dataIndex: 'name', key: 'name' },
        { title: 'Final Value', dataIndex: 'value', key: 'value' },
        { title: 'Last Changed By', dataIndex: 'lastChangedBy', key: 'lastChangedBy' },
        {
          title: 'Last Changed At',
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
