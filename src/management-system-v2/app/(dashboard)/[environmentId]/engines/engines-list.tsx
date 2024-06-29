'use client';

import styles from '@/components/item-list-view.module.scss';
import { Badge, Button, Grid, TableColumnsType, Tooltip, Typography } from 'antd';
import { FaRegSave } from 'react-icons/fa';

import ElementList from '@/components/item-list-view';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
const { Text, Title } = Typography;

export type DiscoveredEngine = {
  id: string;
  name: string;
  hostname: string;
  address: string;
  ownName?: string;
  description?: string;
  discoveryTechnology: string;
};

export type SavedEngine = {
  id: string;
  name?: string;
  hostname?: string;
  address: string;
  ownName?: string;
  description?: string;
};

export type Engine = DiscoveredEngine | SavedEngine;

export enum ActionType {
  EDIT = 'edit',
  DELETE = 'delete',
  SAVE = 'save',
}

const EnginesList = ({
  engines,
  title,
  onAction,
}: {
  engines: DiscoveredEngine[] | SavedEngine[];
  title: string;
  onAction: (action: ActionType, engineId: string) => void;
}) => {
  const breakpoint = Grid.useBreakpoint();

  const isDiscoveredMode = engines.every((engine) => 'discoveryTechnology' in engine);

  const checkEngineStatus = (address: string): 'success' | 'error' => {
    return 'success';
  };

  const columns: TableColumnsType<Engine> = [
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
      title: 'Hostname',
      dataIndex: 'hostname',
      key: 'Hostname',
      sorter: (a, b) => (a.hostname ? a.hostname.localeCompare(b.hostname || '') : -1),
      render: (_, record) => <span>{record.hostname}</span>,
      responsive: ['sm'],
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
      title: 'ID',
      key: 'ID',
      sorter: (a, b) => (a.id ? a.id.localeCompare(b.id || '') : -1),
      render: (_, record) => <span>{record.id}</span>,
      responsive: ['md'],
    },
  ];

  if (isDiscoveredMode) {
    columns.push({
      title: 'Discovery Technology',
      dataIndex: 'discoveryTechnology',
      key: 'Discovery Technology',
      sorter: (a, b) =>
        (a as DiscoveredEngine).discoveryTechnology.localeCompare(
          (b as DiscoveredEngine).discoveryTechnology,
        ),
      render: (_, record) => <span>{(record as DiscoveredEngine).discoveryTechnology}</span>,
      responsive: ['md'],
    });
  } else {
    columns.push({
      title: 'Own Name',
      dataIndex: 'ownName',
      key: 'Own Name',
      sorter: (a, b) => (a.ownName ? a.ownName.localeCompare(b.ownName || '') : -1),
      render: (_, record) => <span>{record.ownName}</span>,
      responsive: ['md'],
    });
  }

  columns.push({
    title: 'Description',
    dataIndex: 'description',
    key: 'Description',
    sorter: (a, b) => (a.description ? a.description.localeCompare(b.description || '') : -1),
    render: (_, record) => <span>{record.description}</span>,
    responsive: ['md'],
  });

  const mobileColumnKeys = ['Name', 'Address', 'Description', 'Meta Data Button'];
  const mobileColumns: TableColumnsType<Engine> = columns.filter((c) =>
    mobileColumnKeys.includes(c.key as string),
  );

  mobileColumns.push({
    fixed: 'right',
    width: 100,
    dataIndex: 'id',
    key: 'Meta Data Button',
    title: '',
    render: (_, record) => {
      return isDiscoveredMode ? (
        <Button
          style={{ float: 'right' }}
          type="text"
          onClick={() => onAction(ActionType.SAVE, record.id)}
        >
          <FaRegSave></FaRegSave>
        </Button>
      ) : (
        <div style={{ float: 'right', display: 'flex', flexDirection: 'row' }}>
          <Button type="text" onClick={() => onAction(ActionType.EDIT, record.id)}>
            <EditOutlined />
          </Button>
          <Button type="text" onClick={() => onAction(ActionType.DELETE, record.id)}>
            <DeleteOutlined />
          </Button>
        </div>
      );
    },
    responsive: ['xs', 'sm'],
  });

  const allColumnTitles = ['Name', 'Hostname', 'ID', 'Address', 'Description'];

  if (isDiscoveredMode) {
    allColumnTitles.push('Discovery Technology');
  } else {
    allColumnTitles.push('Own Name');
  }

  const [selectedColumns, setSelectedColumns] = useState(columns);

  return (
    <>
      <ElementList
        tableProps={{
          title: () => <Text type="secondary">{title}</Text>,
          pagination: { pageSize: 10, position: ['bottomCenter'] },
        }}
        data={engines}
        columns={breakpoint.xl ? selectedColumns : mobileColumns}
        selectableColumns={{
          setColumnTitles: (cols) => {
            if (typeof cols === 'function') {
              cols = cols(selectedColumns.map((col: any) => col.name) as string[]);
            }

            setSelectedColumns(columns.filter((column) => cols.includes(column.key as string)));
          },
          selectedColumnTitles: selectedColumns.map((col) => col.title) as string[],
          allColumnTitles,
          columnProps: {
            fixed: 'right',
            width: '100px',
            responsive: ['xl'],
            render: (id, record) => {
              return isDiscoveredMode ? (
                <Button
                  style={{ float: 'right' }}
                  type="text"
                  onClick={() => onAction(ActionType.SAVE, record.id)}
                >
                  <FaRegSave></FaRegSave>
                </Button>
              ) : (
                <div style={{ float: 'right', display: 'flex', flexDirection: 'row' }}>
                  <Button type="text" onClick={() => onAction(ActionType.EDIT, record.id)}>
                    <EditOutlined />
                  </Button>
                  <Button type="text" onClick={() => onAction(ActionType.DELETE, record.id)}>
                    <DeleteOutlined />
                  </Button>
                </div>
              );
            },
          },
        }}
      ></ElementList>
    </>
  );
};

export default EnginesList;
