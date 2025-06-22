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
import EnginesModal from './engines-modal';
import { updateDbEngine, addDbEngines, deleteSpaceEngine } from '@/lib/data/engines';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useRouter } from 'next/navigation';
import styles from '@/components/item-list-view.module.scss';
import { App, Badge, Button, Grid, Spin, TableColumnsType, TableProps } from 'antd';

import ElementList from '@/components/item-list-view';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Engine as DBEngine } from '@prisma/client';
import { Engine } from '@/lib/engines/machines';
import { useUserPreferences } from '@/lib/user-preferences';

type DBEngineStatus = { online: false } | { online: true; engines: Engine[] };
type InputEngine = DBEngine & { status: ReactNode };

// The status for each engine is streamed in after the page loads, I can't add the status promises
// to the savedEngines prop, because that would trigger a suspense boundary for the hole table.
// The solution is to use smaller components that after being streamed in, will write the status to
// the context
type EnginesStatusContextType = Dispatch<SetStateAction<{ [id: string]: DBEngineStatus }>>;
const EngineStatusContext = createContext<EnginesStatusContextType | undefined>(undefined);

const SavedEnginesList = ({
  savedEngines,

  tableProps,
}: {
  savedEngines: InputEngine[];
  tableProps?: TableProps<InputEngine>;
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

  const [enginesStatus, setEnginesStatus] = useState<{ [id: string]: DBEngineStatus }>({});

  async function deleteEngine(id: string) {
    setLoading(true);
    await wrapServerCall({
      fn: () => deleteSpaceEngine(id, spaceId),
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
        if (editData) return updateDbEngine(editData.id, data, spaceId);
        else return addDbEngines([data], spaceId);
      },
      onSuccess: () => {
        app.message.success({ content: editData ? 'Engine updated' : 'Engine added' });
        router.refresh();
      },
      app,
    });
    setLoading(false);
  }

  const columns: TableColumnsType<InputEngine> = [
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
      title: 'Type',
      key: 'Type',
      render: (_, record) => (record.address.startsWith('mqtt') ? 'MQTT Broker' : 'HTTP Engine'),
    },
    {
      title: 'Engines',
      key: 'engines',
      render: (_, record) => {
        const status = enginesStatus[record.id];

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
    <div>
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

      <EngineStatusContext.Provider value={setEnginesStatus}>
        <ElementList
          tableProps={{
            pagination: { pageSize: 10, position: ['bottomCenter'] },
            expandable: {
              rowExpandable: (record) => {
                const status = enginesStatus[record.id];
                return status && record.address.startsWith('mqtt') && status.online;
              },
              expandedRowRender: (record) => {
                const status = enginesStatus[record.id]!;
                if (!status.online) return;

                return status.engines.map((engine) => engine.id);
              },
            },
            ...tableProps,
          }}
          data={savedEngines}
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
                  <Button type="text" onClick={() => deleteEngine(record.id)}>
                    <DeleteOutlined />
                  </Button>
                </div>
              ),
            },
          }}
        />
      </EngineStatusContext.Provider>

      <EnginesModal
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
    </div>
  );
};

export function EngineStatus({
  engineId,
  status: _status,
}: {
  engineId: string;
  status: Promise<DBEngineStatus>;
}) {
  const status = use(_status);
  const setStatus = use(EngineStatusContext);

  useEffect(() => {
    if (!setStatus) {
      throw new Error('EngineStatus must be used within SavedEnginesList');
    }
    setStatus((prev) => ({ ...prev, [engineId]: status }));
  }, [status, setStatus, engineId]);

  return <Badge style={{ marginLeft: '0.25rem' }} status={status.online ? 'success' : 'error'} />;
}

export default SavedEnginesList;
