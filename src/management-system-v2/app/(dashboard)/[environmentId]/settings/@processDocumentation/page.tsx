import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import SettingsSection from '../settings-section';
import { Setting, SettingGroup } from '../type-util';
import { getCurrentEnvironment } from '@/components/auth';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const settings: SettingGroup = {
    key: 'process-documentation',
    name: 'Process Documentation',
    children: [
      {
        key: 'active',
        name: 'Enabled',
        type: 'boolean',
        description: 'Controls whether this view is activated in this space.',
        value: false,
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
            value: false,
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

  const {
    ability,
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  await populateSpaceSettingsGroup(spaceId, settings, ability);

  return <SettingsSection sectionName="processDocumentation" group={settings} priority={1000} />;
};

export default Page;
