import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { getMachineConfig } from '@/lib/data/legacy/machine-config';
import MachineConfigList from './machine-config-list';

const MachineConfigPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!process.env.ENABLE_MACHINE_CONFIG) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  const data = getMachineConfig(activeEnvironment.spaceId).concat([
    { id: '1', name: 'Test', environmentId: activeEnvironment.spaceId },
    { id: '2', name: 'ABC', environmentId: activeEnvironment.spaceId },
  ]);

  return (
    <Content title="Machine Config">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <MachineConfigList data={data} />
      </Space>
    </Content>
  );
};

export default MachineConfigPage;
