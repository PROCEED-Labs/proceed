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
      key: 'taskPollingInterval',
      name: 'Task Polling Interval',
      type: 'number',
      description:
        'Controls the frequency with which the Management System checks if you have open tasks.',
      value: 10000,
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
        {
          key: 'pollingInterval',
          name: 'Polling Interval',
          type: 'number',
          description: 'Controls the frequency with which the data in tasklist is updated.',
          value: 5000,
        },
      ],
    },
    {
      key: 'task_editor',
      name: 'Task Editor',
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
