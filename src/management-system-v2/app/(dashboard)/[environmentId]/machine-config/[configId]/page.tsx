import Content from '@/components/content';
import { getMachineConfigById, saveMachineConfig } from '@/lib/data/legacy/machine-config';
import MachineConfigEditor from './machine-config-editor';

type MachineConfigProps = {
  params: { configId: string; environmentId: string };
  searchParams: { version?: string };
};

type VariableType = {
  name: string;
  type: string;
  value: string;
};

export default async function MachineConfigView({
  params: { configId, environmentId },
  searchParams,
}: MachineConfigProps) {
  let machineConfig = await getMachineConfigById(configId);

  return (
    <Content title="Machine Configuration">
      <MachineConfigEditor
        originalMachineConfig={machineConfig}
        saveMachineConfig={saveMachineConfig}
        configId={configId}
      />
    </Content>
  );
}
