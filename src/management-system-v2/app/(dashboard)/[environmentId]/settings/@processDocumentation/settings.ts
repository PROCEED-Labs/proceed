import { SettingGroup } from '../type-util';
import { env } from '@/lib/ms-config/env-vars';

const ganttViewSettings = env.PROCEED_PUBLIC_TIMELINE_VIEW === true ? {
  key: 'gantt-view',
  name: 'Gantt View',
  children: [
    {
      key: 'enabled',
      name: 'Enabled',
      type: 'boolean' as const,
      description: 'Controls whether the Gantt view is available in the toolbar.',
      value: true,
    },
    {
      key: 'positioning-logic',
      name: 'Timeline Positioning Logic',
      type: 'select' as const,
      optionType: 'string' as const,
      value: 'earliest-occurrence',
      description: 'Controls how element timing is calculated in the timeline.',
      options: [
        { value: 'earliest-occurrence', label: 'Earliest Occurrence' },
        { value: 'every-occurrence', label: 'Every Occurrence' },
      ],
    },
    {
      key: 'loop-depth',
      name: 'Loop Depth',
      type: 'number' as const,
      value: 1,
      description: 'Maximum number of loop iterations to process in every-occurrence mode.',
      min: 1,
    },
  ],
} : null;

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
    {
      key: 'templates',
      name: 'Process Templates',
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
    ...(ganttViewSettings ? [ganttViewSettings] : []),
  ],
};
