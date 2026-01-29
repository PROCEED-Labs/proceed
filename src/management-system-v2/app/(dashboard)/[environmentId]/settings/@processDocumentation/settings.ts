import { SettingGroup } from '../type-util';
import { ganttViewSettingsDefinition } from '@/components/bpmn-timeline/gantt-settings-definition';
import { getMSConfig } from '@/lib/ms-config/ms-config';

export async function getSettings(): Promise<SettingGroup> {
  const msConfig = await getMSConfig();
  const ganttViewSettings =
    msConfig.PROCEED_PUBLIC_GANTT_ACTIVE === true ? ganttViewSettingsDefinition : null;

  return {
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
            value: true,
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
      // {
      //   key: 'templates',
      //   name: 'Process Templates',
      //   children: [
      //     {
      //       key: 'active',
      //       name: 'Enabled',
      //       type: 'boolean',
      //       description: 'Controls whether this view is activated in this space.',
      //       value: true,
      //     },
      //   ],
      // },
      ...(ganttViewSettings ? [ganttViewSettings] : []),
    ],
  };
}
