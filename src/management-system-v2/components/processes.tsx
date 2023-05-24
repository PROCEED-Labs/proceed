'use client';

import styles from './processes.module.css';
import { FC } from 'react';
import { Dropdown, MenuProps, Table, TableColumnsType } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { fetchProcesses } from '@/lib/fetch-data';
import { useRouter } from 'next/navigation';
import { EllipsisOutlined } from '@ant-design/icons';
import { Processes } from '@/lib/fetch-data';

const processActions: MenuProps['items'] = [
  {
    key: '1',
    label: 'Edit Metadata',
  },
  {
    key: '2',
    label: 'Export',
  },
  {
    key: '3',
    label: 'Delete',
    danger: true,
  },
];

const columns: TableColumnsType<Processes[number]> = [
  {
    title: 'Title',
    dataIndex: 'definitionName',
    className: styles.Title,
    sorter: (a, b) => a.definitionName.localeCompare(b.definitionName),
  },
  {
    title: 'Description',
    dataIndex: 'description',
    sorter: (a, b) => a.description.localeCompare(b.description),
  },
  {
    title: 'Owner',
    dataIndex: 'owner',
  },
  {
    title: 'Created',
    dataIndex: 'createdOn',
    render: (date: Date) => date.toLocaleString(),
    sorter: (a, b) => b.createdOn.getTime() - a.createdOn.getTime(),
  },
  {
    title: 'Edited',
    dataIndex: 'lastEdited',
    render: (date: Date) => date.toLocaleString(),
    sorter: (a, b) => b.lastEdited.getTime() - a.lastEdited.getTime(),
  },
  {
    title: 'Actions',
    fixed: 'right',
    width: 100,
    className: styles.ActionCell,
    render: () => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown menu={{ items: processActions }} arrow>
          <EllipsisOutlined rotate={90} className={styles.Action} />
        </Dropdown>
      </div>
    ),
  },
];

// rowSelection object indicates the need for row selection
const rowSelection = {
  onChange: (selectedRowKeys: React.Key[], selectedRows: Processes) => {
    console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
  },
  getCheckboxProps: (record: Processes[number]) => ({
    name: record.definitionId,
  }),
};

const Processes: FC = () => {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['processes'],
    queryFn: () => fetchProcesses(),
  });

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <Table
      rowSelection={{
        type: 'checkbox',
        ...rowSelection,
      }}
      onRow={(record) => ({
        onClick: () => {
          // TODO: This is a hack to clear the parallel route when selecting
          // another process. (needs upstream fix)
          router.refresh();
          router.push(`/processes/${record.definitionId}`);
        },
      })}
      sticky
      scroll={{ x: 1300 }}
      rowClassName={styles.Row}
      rowKey="definitionId"
      columns={columns}
      dataSource={data as any}
      loading={isLoading}
      className={styles.Table}
    />
  );
};

export default Processes;
