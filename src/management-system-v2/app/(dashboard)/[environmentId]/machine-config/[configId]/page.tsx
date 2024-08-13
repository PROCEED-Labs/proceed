import Content from '@/components/content';
//import styles from './page.module.scss';
import { getConfigurationById, saveParentConfig } from '@/lib/data/legacy/machine-config';
import ConfigPage from './config-page-content';

type MachineConfigProps = {
  params: { configId: string };
  searchParams: { version?: string };
};

const MachineConfigView: React.FC<MachineConfigProps> = async ({ params: { configId } }) => {
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
};

export default MachineConfigView;
