import Content from '@/components/content';
//import styles from './page.module.scss';
import {
  createParentConfig,
  getConfigurationById,
  saveParentConfig,
} from '@/lib/data/legacy/machine-config';
import ConfigPage from './config-page-content';

type MachineConfigProps = {
  params: { configId: string; environmentId: string };
  searchParams: { version?: string };
};

export default async function MachineConfigView({
  params: { configId, environmentId },
  searchParams,
}: MachineConfigProps) {
  let machineConfig = await getConfigurationById(configId);

  //replace ConfigContent <-> MachineConfigEditor as needed
  return (
    <Content title="Machine Configuration">
      <ConfigPage
        originalParentConfig={machineConfig}
        backendSaveParentConfig={saveParentConfig}
        configId={configId}
      />
    </Content>
  );
}
