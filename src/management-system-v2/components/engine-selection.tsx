import { Engine, SpaceEngine } from '@/lib/engines/machines';
import { getExtendedEngines } from '@/lib/engines/server-actions';
import { useQuery } from '@tanstack/react-query';
import { Alert, Modal, Select, Skeleton, Spin } from 'antd';
import { useEnvironment } from './auth-can';
import { useState } from 'react';

type EngineSelectionProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (engine: Engine) => Promise<void>;
};

const automaticDeploymentId = '__automatic_engine_selection__';

const automaticDeployment = {
  name: 'Automatic',
  id: automaticDeploymentId,
  isAutomaticDeployment: true,
} as const;

const EngineSelection: React.FC<EngineSelectionProps> = ({ open, onClose, onSubmit }) => {
  const environment = useEnvironment();

  const { data } = useQuery({
    queryFn: async () => {
      const engines = await getExtendedEngines(environment.spaceId);

      return [automaticDeployment, ...engines];
    },
    queryKey: [environment.spaceId, automaticDeploymentId],
  });

  const [selected, setSelected] = useState(automaticDeploymentId);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (data) {
      if (data.length === 1) {
        onClose();
        setSelected(automaticDeploymentId);
        return;
      }

      const target = data.find((e) => e.id === selected);
      if (target) {
        setLoading(true);
        if ('isAutomaticDeployment' in target) {
          await onSubmit(data.find((e) => e.id !== automaticDeploymentId) as Engine);
        } else {
          await onSubmit(target);
        }
        setSelected(automaticDeploymentId);
        setLoading(false);
      }
    }
  };

  let content = <Skeleton active />;

  if (data) {
    // the data includes no entry except the "Automatic Entry" so there are no engines to deploy to
    if (data.length === 1) {
      content = (
        <Alert type="warning" message="Could not find an engine to deploy the process to." />
      );
    } else {
      content = (
        <Select
          style={{ width: '100%' }}
          options={data}
          fieldNames={{ label: 'name', value: 'id' }}
          value={selected}
          onChange={(value) => setSelected(value)}
        />
      );
    }
  }

  return (
    <Modal
      open={open}
      title="Select an Engine"
      onClose={onClose}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={data?.length === 1 ? 'Ok' : 'Deploy'}
      okButtonProps={{ loading, disabled: !data }}
    >
      {content}
    </Modal>
  );
};

export default EngineSelection;
