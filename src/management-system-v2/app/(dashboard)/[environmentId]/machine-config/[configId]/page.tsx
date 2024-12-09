import Content from '@/components/content';
//import styles from './page.module.scss';
import { getDeepParentConfigurationById } from '@/lib/data/legacy/machine-config';
import ConfigPage from './config-page-content';

type MachineConfigProps = {
  params: { configId: string };
  searchParams: { version?: string };
};

const MachineConfigView: React.FC<MachineConfigProps> = async ({
  params: { configId },
  searchParams,
}) => {
  const selectedVersionId = searchParams.version ? +searchParams.version : undefined;
  let machineConfig = await getDeepParentConfigurationById(configId, selectedVersionId);

  //replace ConfigContent <-> MachineConfigEditor as needed
  return (
    <Content title={`Tech Data Set: ${machineConfig.name}`}>
      <ConfigPage parentConfig={machineConfig} editingAllowed={!selectedVersionId} />
    </Content>
  );
};

export default MachineConfigView;
