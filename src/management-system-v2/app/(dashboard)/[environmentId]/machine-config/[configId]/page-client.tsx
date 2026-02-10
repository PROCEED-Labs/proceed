'use client';

import Content from '@/components/content';
import AasConfigContent from './aas-config-page-content';
import { Config } from '@/lib/data/machine-config-schema';
import { EditOutlined } from '@ant-design/icons';
import { useConfigEditStore } from './store/useConfigEditStore';

type Props = {
  config: Config;
  source?: string;
};

export default function MachineConfigViewClient({ config, source }: Props) {
  const openEditModal = useConfigEditStore((state) => state.openEditModal);

  return (
    <Content
      title={
        <>
          Tech Data Set: {`${config.shortName.value} - ${config.name.value}`}
          <EditOutlined style={{ margin: '0 10px', cursor: 'pointer' }} onClick={openEditModal} />
        </>
      }
    >
      <AasConfigContent parentConfig={config} editingAllowed={true} source={source} />
    </Content>
  );
}
