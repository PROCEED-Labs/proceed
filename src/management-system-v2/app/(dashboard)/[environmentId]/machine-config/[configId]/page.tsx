import Content from '@/components/content';
//import styles from './page.module.scss';
import { getDeepParentConfigurationById } from '@/lib/data/legacy/machine-config';
import ConfigPage from './config-page-content';

const MachineConfigView: React.FC<AsyncPageProps> = async ({ params }) => {
  const { configId } = await params;

  let machineConfig = await getDeepParentConfigurationById(configId);

  //replace ConfigContent <-> MachineConfigEditor as needed
  return (
    <Content title={`Tech Data Set: ${machineConfig.name}`}>
      <ConfigPage parentConfig={machineConfig} />
    </Content>
  );
};

export default MachineConfigView;
