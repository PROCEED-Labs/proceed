'use client';

import {
  ReactNode,
  useState,
  use,
  createContext,
  Dispatch,
  useEffect,
  SetStateAction,
} from 'react';
import ConnectionsModal from './engines-modal';
import {
  updateEngineConnection,
  addEngineConnections,
  deleteEngineConnection,
} from '@/lib/data/engines';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useRouter } from 'next/navigation';
import styles from '@/components/item-list-view.module.scss';
import { App, Badge, Button, Grid, Spin, TableColumnsType, TableProps } from 'antd';

import ElementList from '@/components/item-list-view';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { type EngineConnection } from '@prisma/client';
import { Engine } from '@/lib/engines/types';
import { useUserPreferences } from '@/lib/user-preferences';
import Link from 'next/link';

type ConnectionStatus = { online: false } | { online: true; engines: Engine[] };
type InputConnection = EngineConnection & { status: ReactNode };

// The status for each connection is streamed in after the page loads, I can't add the status promises
// to the connections prop, because that would trigger a suspense boundary for the whole table.
// The solution is to use smaller components that after being streamed in, will write the status to
// the context
type ConnectionStatusContextType = Dispatch<SetStateAction<{ [id: string]: ConnectionStatus }>>;
const ConnectionStatusContext = createContext<ConnectionStatusContextType | undefined>(undefined);

const EngineConnectionsList = ({
  connections,
  tableProps,
  engineDashboardLinkPrefix,
}: {
  connections: InputConnection[];
  tableProps?: TableProps<InputConnection>;
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

  const [connectionsStatus, setConnectionsStatus] = useState<{ [id: string]: ConnectionStatus }>(
    {},
  );

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
        else return addEngineConnections([data], spaceId);
      },
      onSuccess: () => {
        app.message.success({ content: editData ? 'Engine updated' : 'Engine added' });
        router.refresh();
      },
      app,
    });
    setLoading(false);
  }

  const columns: TableColumnsType<InputConnection> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'Name',
      ellipsis: true,
      sorter: (a, b) => (a.name ? a.name.localeCompare(b.name || '') : -1),
      render: (_, record) => (
        <Link
          href={`${engineDashboardLinkPrefix}/${record.id}`}
          className={
            breakpoint.xs
              ? styles.MobileTitleTruncation
              : breakpoint.xl
                ? styles.TitleTruncation
                : styles.TabletTitleTruncation
          }
        >
          {record.name}
        </Link>
      ),
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
      render: (_, record) => {
        const status = connectionsStatus[record.id];

        if (!status) {
          return <Spin spinning />;
        } else if (!status.online) {
          return 0;
        } else {
          return status.engines.length;
        }
      },
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
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

      <ConnectionStatusContext.Provider value={setConnectionsStatus}>
        <ElementList
          tableProps={{
            pagination: { pageSize: 10, placement: ['bottomCenter'] },
            expandable: {
              rowExpandable: (record) => {
                const status = connectionsStatus[record.id];
                return status && record.address.startsWith('mqtt') && status.online;
              },
              expandedRowRender: (record) => {
                const status = connectionsStatus[record.id]!;
                if (!status.online) return;

                return status.engines.map((engine) => (
                  <Link
                    key={engine.id}
                    href={`${engineDashboardLinkPrefix}/${record.id}?engineId=${engine.id}`}
                  >
                    {engine.id}
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
              render: (id, record) => (
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
      </ConnectionStatusContext.Provider>

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

export function ConnectionStatus({
  connectionId,
  status: _status,
}: {
  connectionId: string;
  status: Promise<ConnectionStatus>;
}) {
  const status = use(_status);
  const setStatus = use(ConnectionStatusContext);

  useEffect(() => {
    if (!setStatus) {
      throw new Error('EngineStatus must be used within EngineConnectionsList');
    }
    setStatus((prev) => ({ ...prev, [connectionId]: status }));
  }, [status, setStatus, connectionId]);

  return <Badge style={{ marginLeft: '0.25rem' }} status={status.online ? 'success' : 'error'} />;
}

export default EngineConnectionsList;
