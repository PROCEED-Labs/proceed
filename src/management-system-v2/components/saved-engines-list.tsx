'use client';

import { App, Button } from 'antd';
import { useState } from 'react';
import EnginesModal from './engines-modal';
import EnginesList, { ActionType, SavedEngine } from './engines-list';
import { updateDbEngine, addDbEngines, deleteSpaceEngine } from '@/lib/data/engines';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useRouter } from 'next/navigation';

const SavedEnginesList = ({ savedEngines }: { savedEngines: SavedEngine[] }) => {
  const router = useRouter();
  const _spaceId = useEnvironment().spaceId;
  const spaceId = _spaceId === '' ? null : _spaceId;
  const app = App.useApp();

  const [loading, setLoading] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editData, setEditData] = useState<
    { id: string; name: string; address: string } | undefined
  >();

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

      <EnginesList
        engines={savedEngines}
        tableProps={{ loading }}
        onAction={(action, id) => {
          if (action === ActionType.DELETE) {
            deleteEngine(id);
          }

          if (action === ActionType.EDIT) {
            const editEngine = savedEngines.find((engine) => engine.id === id)!;
            setEditData({
              id: editEngine.id,
              name: editEngine.name || '',
              address: editEngine.address,
            });
            setModalIsOpen(true);
          }
        }}
      />

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

export default SavedEnginesList;
