import { Engine } from '@/lib/engines/machines';
import { getExtendedEngines } from '@/lib/engines/server-actions';
import { useQuery } from '@tanstack/react-query';
import { Alert, Modal, Select, Skeleton } from 'antd';
import { useEnvironment } from './auth-can';
import { useState } from 'react';

type EngineSelectionProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (engine: Engine) => Promise<void>;
};

export const automaticDeploymentId = '__automatic_engine_selection__';

const automaticDeployment = {
  name: 'Automatic',
  id: automaticDeploymentId,
  isAutomaticDeployment: true,
} as const;

export const useExtendedEngines = (disabled = false) => {
  const environment = useEnvironment();

  const { data } = useQuery({
    queryFn: async () => await getExtendedEngines(environment.spaceId),
    queryKey: ['extended-engines', environment.spaceId],
    enabled: !disabled,
  });

  if (!data) return;
  if (!data.length) return data;

  return [automaticDeployment, ...data];
};

type SelectableEngines = ReturnType<typeof useExtendedEngines>;

export const EngineSelection: React.FC<{
  selectedEngineId?: string;
  engines: NonNullable<SelectableEngines>;
  onChange: (selectedId: string) => void;
}> = ({ selectedEngineId = automaticDeploymentId, engines, onChange }) => {
  if (!engines.length) {
    return <Alert type="warning" message="Could not find an engine to deploy the process to." />;
  }

  return (
    <Select
      style={{ width: '100%' }}
      options={engines}
      fieldNames={{ label: 'name', value: 'id' }}
      value={selectedEngineId || automaticDeploymentId}
      onChange={onChange}
    />
  );
};

const EngineSelectionModal: React.FC<EngineSelectionProps> = ({ open, onSubmit, onClose }) => {
  const engines = useExtendedEngines();

  const [selectedId, setSelectedId] = useState(automaticDeploymentId);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (engines) {
      if (engines.length === 1) {
        onClose();
        setSelectedId(automaticDeploymentId);
        return;
      }

      const target = engines.find((e) => e.id === selectedId);
      if (target) {
        setLoading(true);
        if ('isAutomaticDeployment' in target) {
          await onSubmit(engines.find((e) => e.id !== automaticDeploymentId) as Engine);
        } else {
          await onSubmit(target);
        }
        setSelectedId(automaticDeploymentId);
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      open={open}
      centered
      title="Select an Engine"
      onCancel={onClose}
      onOk={handleSubmit}
      okText={engines?.length === 1 ? 'Ok' : 'Deploy'}
      okButtonProps={{ loading, disabled: !engines?.length }}
    >
      {engines ? (
        <EngineSelection selectedEngineId={selectedId} engines={engines} onChange={setSelectedId} />
      ) : (
        <Skeleton active />
      )}
    </Modal>
  );
};

export default EngineSelectionModal;
