//I have no idea what I'm doing...

import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
//import styles from './page.module.scss';
import { getMachineConfig, getMachineConfigById } from '@/lib/data/legacy/machine-config';
//import { toCaslResource } from '@/lib/ability/caslAbility';

type MachineConfigProps = {
  params: { configId: string; environmentId: string };
  searchParams: { version?: string };
};

const MachineConfig = async ({
  params: { configId, environmentId },
  searchParams,
}: MachineConfigProps) => {
  const { ability } = await getCurrentEnvironment(environmentId);
  const machineConfig = getMachineConfigById(configId, ability);

  return (
    <Content title="Machine Config">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <div>{`Hi there, this is going to be a MachineConfig for ${configId} soon...`}</div>
      </Space>
    </Content>
  );
};

export default MachineConfig;
