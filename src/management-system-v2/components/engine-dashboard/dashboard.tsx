import { Tabs } from 'antd';
import ConfigurationTable from './configuration-table';
import EngineOverview from './engine-overview';

export default function EngineDashboard({
  online,
  configuration,
  machineData,
}: {
  online: boolean;
  configuration: any;
  machineData: any;
}) {
  return (
    <Tabs
      style={{ height: '100%' }}
      items={[
        {
          key: 'overview',
          label: 'Overview',
          children: <EngineOverview online={online} engine={machineData} />,
        },
        {
          key: 'configuration',
          label: 'Configuration',
          children: <ConfigurationTable configuration={configuration} engine={machineData} />,
        },
      ]}
    />
  );
}
