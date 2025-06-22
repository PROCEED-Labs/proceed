import { SettingGroup } from '../type-util';

export const settings: SettingGroup = {
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
    // {
    //   key: 'projects',
    //   name: 'Projects',
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
      key: 'process-engines',
      name: 'Process Engines',
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
