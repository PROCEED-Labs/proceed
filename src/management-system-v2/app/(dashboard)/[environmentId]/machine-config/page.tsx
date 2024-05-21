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
    {
      id: '1',
      name: 'Test',
      environmentId: activeEnvironment.spaceId,
      /* createdBy: '1',
      createdAt: '2021-01-01',
      updatedAt: '2021-01-01',
      parentId: null, */
    },
    {
      id: '2',
      name: 'ABC',
      environmentId: activeEnvironment.spaceId,
      /* createdBy: '1',
      createdAt: '2021-01-01',
      updatedAt: '2021-01-01',
      parentId: null, */
    },
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
