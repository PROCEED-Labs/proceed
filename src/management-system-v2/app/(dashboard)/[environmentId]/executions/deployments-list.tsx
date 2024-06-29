'use client';

import styles from '@/components/item-list-view.module.scss';
import { Button, Grid, TableColumnsType } from 'antd';
import { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';

import ElementList from '@/components/item-list-view';
import { DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';

type InputItem = {
  id: string;
  name: string;
  versions: number;
  runningInstances: number;
  endedInstances: number;
};
export type DeployedProcessListProcess = ReplaceKeysWithHighlighted<InputItem, 'name'>;

const DeploymentsList = ({ processes }: { processes: DeployedProcessListProcess[] }) => {
  const breakpoint = Grid.useBreakpoint();

  const columns: TableColumnsType<DeployedProcessListProcess> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'Name',
      ellipsis: true,
      sorter: (a, b) => a.name.value.localeCompare(b.name.value),
      render: (_, record) => (
        <div
          className={
            breakpoint.xs
              ? styles.MobileTitleTruncation
              : breakpoint.xl
                ? styles.TitleTruncation
                : styles.TabletTitleTruncation
          }
        >
          {record.name.highlighted}
        </div>
      ),
      responsive: ['xs', 'sm'],
    },
    {
      title: 'Versions',
      dataIndex: 'description',
      key: 'Versions',
      render: (_, record) => <span>{record.versions}</span>,
      sorter: (a, b) => (a < b ? -1 : 1),
      responsive: ['sm'],
    },
    {
      title: 'Running Instances',
      dataIndex: 'runningInstances',
      key: 'Running Instances',
      render: (_, record) => <span>{record.runningInstances}</span>,
      sorter: (a, b) => (a < b ? -1 : 1),
      responsive: ['md'],
    },
    {
      title: 'Ended Instances',
      dataIndex: 'endedInstances',
      key: 'Ended Instances',
      render: (_, record) => <span>{record.endedInstances}</span>,
      sorter: (a, b) => (a < b ? -1 : 1),
      responsive: ['md'],
    },
  ];

  const mobileColumns: TableColumnsType<DeployedProcessListProcess> = [
    ...columns,
    {
      fixed: 'right',
      width: 160,
      dataIndex: 'id',
      key: 'Meta Data Button',
      title: '',
      render: (id, record) => {
        return (
          <Button style={{ float: 'right' }} type="text">
            <DeleteOutlined color="red" />
          </Button>
        );
      },
      responsive: breakpoint.xl ? ['xs'] : ['xs', 'sm'],
    },
  ];

  const [selectedColumns, setSelectedColumns] = useState(columns);

  return (
    <>
      <ElementList
        data={processes}
        columns={breakpoint.xl ? selectedColumns : mobileColumns}
        selectableColumns={{
          setColumnTitles: (cols) => {
            if (typeof cols === 'function') {
              cols = cols(selectedColumns.map((col: any) => col.name) as string[]);
            }
            setSelectedColumns(columns.filter((column) => cols.includes(column.key as string)));
          },
          selectedColumnTitles: selectedColumns.map((c) => c.title) as string[],
          allColumnTitles: ['Versions', 'Running Instances', 'Ended Instances'],
          columnProps: {
            width: '150px',
            responsive: ['xl'],
            render: (id, record) => {
              return (
                <Button style={{ float: 'right' }} type="text">
                  <DeleteOutlined color="red" />
                </Button>
              );
            },
          },
        }}
      ></ElementList>
    </>
  );
};

export default DeploymentsList;
