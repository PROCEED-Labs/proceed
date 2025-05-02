import SettingsSection from '../settings-section';
import { SettingGroup } from '../type-util';

const Page = async () => {
  const settings: SettingGroup = {
    key: 'process-documentation',
    name: 'Process Documentation',
    children: [
      {
        key: 'active',
        name: 'Enabled',
        type: 'boolean',
        description: 'Controls whether this view is activated in this space.',
        value: true,
      },
      {
        key: 'list',
        name: 'Process List',
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
        key: 'editor',
        name: 'Process Editor',
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
        key: 'templates',
        name: 'Process Templates',
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
    ],
  };

  return <SettingsSection sectionName="processDocumentation" group={settings} priority={1000} />;
};

export default Page;
