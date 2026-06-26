'use client';

import { useState } from 'react';
import ConnectionsModal from './engines-modal';
import {
  updateEngineConnection,
  addEngineConnection,
  deleteEngineConnection,
} from '@/lib/data/engines';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useRouter } from 'next/navigation';
import styles from '@/components/item-list-view.module.scss';
import { App, Badge, Button, Grid, TableColumnsType, TableProps } from 'antd';

import ElementList from '@/components/item-list-view';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUserPreferences } from '@/lib/user-preferences';
import Link from 'next/link';
import { Connection, isHttpConnection, isMqttConnection } from '@/lib/engines/types';

const EngineConnectionsList = ({
  connections,
  tableProps,
  engineDashboardLinkPrefix,
}: {
  connections: Connection[];
  tableProps?: TableProps<Connection>;
  engineDashboardLinkPrefix: string;
}) => {
  const router = useRouter();
  const _spaceId = useEnvironment().spaceId;
  const spaceId = _spaceId === '' ? null : _spaceId;
  const breakpoint = Grid.useBreakpoint();
  const app = App.useApp();

  const selectedColumns = useUserPreferences.use['columns-in-engine-view']();
  const setUserPreferences = useUserPreferences.use.addPreferences();

  const [loading, setLoading] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editData, setEditData] = useState<
    { id: string; name: string | null; address: string } | undefined
  >();

  async function deleteConnection(id: string) {
    setLoading(true);
    await wrapServerCall({
      fn: () => deleteEngineConnection(id, spaceId),
      onSuccess: () => {
        app.message.success({ content: 'Engine deleted' });
        router.refresh();
      },
      app,
    });
    setLoading(false);
  }

  async function submitData(data: any) {
    setLoading(true);
    await wrapServerCall({
      fn: (): Promise<any> => {
        if (editData) return updateEngineConnection(editData.id, data, spaceId);
        else return addEngineConnection(data, spaceId);
      },
      onSuccess: () => {
        app.message.success({ content: editData ? 'Engine updated' : 'Engine added' });
        router.refresh();
      },
      app,
    });
    setLoading(false);
  }

  const columns: TableColumnsType<Connection> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'Name',
      ellipsis: true,
      sorter: (a, b) => (a.name ? a.name.localeCompare(b.name || '') : -1),
      render: (_, record) => {
        const text = record.name;

        if (isHttpConnection(record) && record.engines.length) {
          return (
            <Link
              href={`${engineDashboardLinkPrefix}/${record.engines[0].engine.id}`}
              className={
                breakpoint.xs
                  ? styles.MobileTitleTruncation
                  : breakpoint.xl
                    ? styles.TitleTruncation
                    : styles.TabletTitleTruncation
              }
            >
              {text}
            </Link>
          );
        }

        return text;
      },
      responsive: ['xs', 'sm'],
    },
    {
      title: 'Type',
      key: 'Type',
      render: (_, record) => (record.address.startsWith('mqtt') ? 'MQTT Broker' : 'HTTP Engine'),
    },
    {
      title: 'Engines',
      key: 'engines',
      render: (_, record) => record.engines.length,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        let online = !!record.engines.filter((e) => e.reachable).length;
        return <Badge style={{ marginLeft: '0.25rem' }} status={online ? 'success' : 'error'} />;
      },
    },
  ];

  const filteredColumns = columns.filter((col) =>
    selectedColumns.some((sel) => sel.name === col.title),
  );

  return (
    <>
      <div style={{ marginBottom: '0.5rem' }}>
        <Button
          type="primary"
          onClick={() => {
            setModalIsOpen(true);
          }}
        >
          Add Engine
        </Button>
      </div>

      <ElementList
        tableProps={{
          pagination: { pageSize: 10, placement: ['bottomCenter'] },
          expandable: {
            rowExpandable: (record) => isMqttConnection(record),
            expandedRowRender: (record) => {
              return record.engines.map(({ engine }) => (
                <Link key={engine.id} href={`${engineDashboardLinkPrefix}/${engine.id}`}>
                  {engine.name || engine.id}
                </Link>
              ));
            },
          },
          ...tableProps,
        }}
        data={connections}
        columns={filteredColumns}
        selectableColumns={{
          setColumnTitles: (fn) => {
            let cols;
            if (typeof fn === 'function') cols = fn(selectedColumns.map((col) => col.name));
            else cols = fn;

            setUserPreferences({
              'columns-in-engine-view': cols.map((col) => ({ name: col, width: 'auto' })),
            });
          },
          selectedColumnTitles: selectedColumns.map((col) => col.name),
          allColumnTitles: columns.map((col) => col.title) as string[],
          columnProps: {
            fixed: 'right',
            width: '100px',
            responsive: ['xl'],
            render: (_, record) => (
              <div style={{ float: 'right', display: 'flex', flexDirection: 'row' }}>
                <Button
                  type="text"
                  onClick={() => {
                    setEditData({ ...record });
                    setModalIsOpen(true);
                  }}
                >
                  <EditOutlined />
                </Button>
                <Button
                  type="text"
                  onClick={() =>
                    app.modal.confirm({
                      title: 'Delete Engine',
                      content: 'This action cannot be undone.',
                      okText: 'Delete',
                      onOk: () => deleteConnection(record.id),
                    })
                  }
                >
                  <DeleteOutlined />
                </Button>
              </div>
            ),
          },
        }}
      />

      <ConnectionsModal
        title={editData ? 'Edit Engine' : 'Add Engine'}
        open={modalIsOpen}
        close={async (data) => {
          if (data) await submitData(data);
          setEditData(undefined);
          setModalIsOpen(false);
        }}
        initialData={editData && { address: editData.address, name: editData.name }}
        modalProps={{ okButtonProps: { loading } }}
      />
    </>
  );
};

export default EngineConnectionsList;
