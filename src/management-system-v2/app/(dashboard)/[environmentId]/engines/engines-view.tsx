'use client';

import { Button } from 'antd';
import { useState } from 'react';
import EnginesModal from './engines-modal';
import EnginesList, { ActionType, DiscoveredEngine, SavedEngine } from './engines-list';
import { v4 } from 'uuid';

const EnginesView = ({
  savedEngines: initialSavedEngines,
  discoveredEngines: initialDiscoveredEngines,
}: {
  savedEngines: SavedEngine[];
  discoveredEngines: DiscoveredEngine[];
}) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [savedEngines, setSavedEngines] = useState(initialSavedEngines);
  const [discoveredEngines, setDiscoveredEngines] = useState(initialDiscoveredEngines);
  const [editData, setEditData] = useState<
    { id: string; ownName: string; address: string } | undefined
  >(undefined);

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
        title="Discovered"
        engines={discoveredEngines}
        onAction={(action, id) => {
          if (action === ActionType.SAVE) {
            const newDiscoveredEngines = discoveredEngines.filter((engine) => engine.id !== id);
            const savedDiscoveredEngine = discoveredEngines.find((engine) => engine.id === id);

            if (savedDiscoveredEngine) {
              const { discoveryTechnology, ...otherEngineProperties } = savedDiscoveredEngine;
              setDiscoveredEngines(newDiscoveredEngines);
              setSavedEngines([...savedEngines, { ...otherEngineProperties } as SavedEngine]);
            }
          }
        }}
      ></EnginesList>
      <EnginesList
        title="Saved"
        engines={savedEngines}
        onAction={(action, id) => {
          if (action === ActionType.DELETE) {
            const newSavedEngines = savedEngines.filter((engine) => engine.id !== id);
            setSavedEngines(newSavedEngines);
          }

          if (action === ActionType.EDIT) {
            const editEngine = savedEngines.find((engine) => engine.id === id)!;
            setEditData({
              id: editEngine.id,
              ownName: editEngine.ownName || '',
              address: editEngine.address,
            });
            setModalIsOpen(true);
          }
        }}
      ></EnginesList>

      <EnginesModal
        title={editData ? 'Edit Engine' : 'Add Engine'}
        open={modalIsOpen}
        close={(data) => {
          if (data) {
            if (editData) {
              const newSavedEngines = savedEngines.map((engine) => {
                if (engine.id === editData.id) {
                  return { ...engine, ownName: data.ownName, address: data.address };
                }
                return engine;
              });

              setSavedEngines([...newSavedEngines]);
            } else {
              setSavedEngines([...savedEngines, { ...data, id: v4() }]);
            }
          }
          setEditData(undefined);
          setModalIsOpen(false);
        }}
        initialData={editData && { address: editData.address, ownName: editData.ownName }}
      ></EnginesModal>
    </div>
  );
};

export default EnginesView;
