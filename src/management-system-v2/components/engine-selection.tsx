import { getUniqueEngines } from '@/lib/engines/server-actions';
import { useQuery } from '@tanstack/react-query';
import { Alert, Select } from 'antd';
import { useEnvironment } from './auth-can';

export const automaticDeploymentId = '__automatic_engine_selection__';

const automaticDeployment = {
  name: 'Automatic',
  id: automaticDeploymentId,
  isAutomaticDeployment: true,
} as const;

export const useUniqueEngines = (disabled = false) => {
  const environment = useEnvironment();

  const { data } = useQuery({
    queryFn: async () => await getUniqueEngines(environment.spaceId),
    queryKey: ['unique-engines', environment.spaceId],
    enabled: !disabled,
  });

  if (!data) return;
  if (!data.length) return data;

  return [automaticDeployment, ...data];
};

type SelectableEngines = ReturnType<typeof useUniqueEngines>;

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
