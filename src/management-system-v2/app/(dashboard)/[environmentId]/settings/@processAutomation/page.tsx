import { Setting, SettingGroup } from '../type-util';
import SettingsSection from '../settings-section';
import { env } from '@/lib/env-vars';
import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import { getCurrentEnvironment } from '@/components/auth';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) return null;

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
            value: false,
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
            value: '',
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

  const {
    ability,
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  await populateSpaceSettingsGroup(spaceId, settings, ability);

  return <SettingsSection sectionName="processAutomation" group={settings} priority={900} />;
};

export default Page;
