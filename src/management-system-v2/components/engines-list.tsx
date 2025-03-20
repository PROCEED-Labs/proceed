'use client';

import styles from '@/components/item-list-view.module.scss';
import { Badge, Button, Grid, TableColumnsType, TableProps, Tooltip, Typography } from 'antd';

import ElementList from '@/components/item-list-view';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Prisma } from '@prisma/client';
const { Text } = Typography;

export type SavedEngine = Prisma.EngineGetPayload<true>;

export enum ActionType {
  EDIT = 'edit',
  DELETE = 'delete',
  SAVE = 'save',
}

const EnginesList = ({
  engines,
  title,
  onAction,
  tableProps,
}: {
  engines: SavedEngine[];
  title?: string;
  onAction: (action: ActionType, engineId: string) => void;
  tableProps?: TableProps<SavedEngine>;
}) => {
  const breakpoint = Grid.useBreakpoint();

  const checkEngineStatus = (_: string): 'success' | 'error' => {
    return 'success';
  };

  const columns: TableColumnsType<SavedEngine> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'Name',
      ellipsis: true,
      sorter: (a, b) => (a.name ? a.name.localeCompare(b.name || '') : -1),
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
          {record.name}
        </div>
      ),
      responsive: ['xs', 'sm'],
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'Address',
      sorter: (a, b) => a.address.localeCompare(b.address),
      render: (_, record) => {
        const status = checkEngineStatus(record.address);
        return (
          <Tooltip title={status === 'success' ? 'Online' : 'Not accessible'} placement="top">
            <span>{record.address}</span>
            <Badge style={{ marginLeft: '0.25rem' }} status={status} />
          </Tooltip>
        );
      },
      responsive: ['xs', 'sm'],
    },
    {
      fixed: 'right',
      width: 100,
      dataIndex: 'id',
      key: 'Meta Data Button',
      title: '',
      render: (_, record) => (
        <div style={{ float: 'right', display: 'flex', flexDirection: 'row' }}>
          <Button type="text" onClick={() => onAction(ActionType.EDIT, record.id)}>
            <EditOutlined />
          </Button>
          <Button type="text" onClick={() => onAction(ActionType.DELETE, record.id)}>
            <DeleteOutlined />
          </Button>
        </div>
      ),
      responsive: breakpoint.xl ? ['xs'] : ['xs', 'sm'],
    },
  ];

  const [selectedColumns, setSelectedColumns] = useState(columns);

  return (
    <ElementList
      tableProps={{
        title: title ? () => <Text type="secondary">{title}</Text> : undefined,
        pagination: { pageSize: 10, position: ['bottomCenter'] },
        ...tableProps,
      }}
      data={engines}
      columns={
        breakpoint.xl
          ? selectedColumns.filter((c) => c.key !== 'Meta Data Button')
          : selectedColumns
      }
      selectableColumns={{
        setColumnTitles: (cols) => {
          if (typeof cols === 'function') {
            cols = cols(selectedColumns.map((col: any) => col.name) as string[]);
          }

          setSelectedColumns(columns.filter((column) => cols.includes(column.key as string)));
        },
        selectedColumnTitles: selectedColumns.map((col) => col.title) as string[],
        allColumnTitles: columns.map((col) => col.key) as string[],
        columnProps: {
          fixed: 'right',
          width: '100px',
          responsive: ['xl'],
          render: (id, record) => (
            <div style={{ float: 'right', display: 'flex', flexDirection: 'row' }}>
              <Button type="text" onClick={() => onAction(ActionType.EDIT, record.id)}>
                <EditOutlined />
              </Button>
              <Button type="text" onClick={() => onAction(ActionType.DELETE, record.id)}>
                <DeleteOutlined />
              </Button>
            </div>
          ),
        },
      }}
    />
  );
};

export default EnginesList;
