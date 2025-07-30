import { SettingGroup } from '../type-util';
import { env } from '@/lib/ms-config/env-vars';
import { ganttViewSettingsDefinition } from '@/components/bpmn-timeline/gantt-settings-definition';

const ganttViewSettings =
  env.PROCEED_PUBLIC_TIMELINE_VIEW === true ? ganttViewSettingsDefinition : null;

export const settings: SettingGroup = {
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
