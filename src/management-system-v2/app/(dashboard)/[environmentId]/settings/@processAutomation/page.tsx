import { SettingGroup } from '../type-util';
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
        value: true,
      },
      {
        key: 'tasklist',
        name: 'Task List',
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
        key: 'dashboard',
        name: 'Dashboard',
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
        key: 'projects',
        name: 'Projects',
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
            value: true,
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
