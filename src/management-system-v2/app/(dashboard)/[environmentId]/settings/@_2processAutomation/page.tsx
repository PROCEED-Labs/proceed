import { SettingGroup } from '../type-util';
import SettingsSection from '../settings-section';

const Page = async () => {
  const settings: SettingGroup = {
    key: 'process-automation',
    name: 'Process Automation',
    children: [
      {
        key: 'active',
        name: 'Enabled',
        type: 'boolean',
        description: 'Controls whether this view is activated in this space.',
        value: false,
      },
      {
        key: 'dashboard',
        name: 'Dashboard',
        children: [
          {
            key: 'active',
            name: 'Enabled',
            type: 'boolean',
            description: 'Controls whether this view is activated in this space.',
            value: false,
          },
        ],
      },
      {
        key: 'projects',
        name: 'Projects',
        children: [
          {
            key: 'active',
            name: 'Enabled',
            type: 'boolean',
            description: 'Controls whether this view is activated in this space.',
            value: false,
          },
        ],
      },
      {
        key: 'executions',
        name: 'Executions',
        children: [
          {
            key: 'active',
            name: 'Enabled',
            type: 'boolean',
            description: 'Controls whether this view is activated in this space.',
            value: true,
          },
        ],
      },
      {
        key: 'machines',
        name: 'Machines',
        children: [
          {
            key: 'active',
            name: 'Enabled',
            type: 'boolean',
            description: 'Controls whether this view is activated in this space.',
            value: false,
          },
          {
            key: 'machine-type',
            name: 'Machine Type',
            type: 'select',
            optionType: 'string',
            description: 'Controls the type of machines that are used by this space',
            value: 'http+mqtt',
            options: [
              { value: 'http', label: 'HTTP' },
              { value: 'mqtt', label: 'MQTT' },
              { value: 'http+mqtt', label: 'Both' },
            ],
          },
        ],
      },
    ],
  };

  return <SettingsSection group={settings} />;
};

export default Page;
