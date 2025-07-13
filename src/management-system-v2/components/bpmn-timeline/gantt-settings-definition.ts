import type { SettingGroup } from '../../app/(dashboard)/[environmentId]/settings/type-util';

/**
 * Gantt view settings definition that can be reused in both the main settings page
 * and the BPMN timeline settings popup
 */
export const ganttViewSettingsDefinition: SettingGroup = {
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
        { value: 'latest-occurrence', label: 'Latest Occurrence' },
      ],
    },
    {
      key: 'loop-depth',
      name: 'Loop Depth',
      type: 'number' as const,
      value: 1,
      description:
        'Maximum number of loop iterations to process in every-occurrence mode. Minimum value is 0 which means no loops are processed.',
    },
    {
      key: 'chronological-sorting',
      name: 'Chronological Sorting',
      type: 'boolean' as const,
      value: false,
      description: 'Sort Gantt tasks chronologically within their connected flow groups.',
    },
    {
      key: 'show-loop-icons',
      name: 'Show Loop Detection Icons',
      type: 'boolean' as const,
      value: true,
      description:
        'Show warning icons for elements that are part of loops or where flow traversal was cut off. Only for "Every Occurrence" mode.',
    },
    {
      key: 'curved-dependencies',
      name: 'Curved Dependencies',
      type: 'boolean' as const,
      value: false,
      description:
        'Use curved lines for dependency arrows instead of straight edges for a more organic appearance.',
    },
    {
      key: 'render-gateways',
      name: 'Render Gateways as Milestones',
      type: 'boolean' as const,
      value: false,
      description:
        'When enabled, gateways are rendered as milestones in the timeline instead of being preprocessed into direct dependencies.',
    },
  ],
};
