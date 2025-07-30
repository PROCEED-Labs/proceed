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
    // Core Timeline Settings
    {
      key: 'positioning-logic',
      name: 'Timeline Positioning Logic',
      type: 'select' as const,
      optionType: 'string' as const,
      value: 'earliest-occurrence',
      description: 'Controls how element timing is calculated in the timeline.',
      options: [
        { value: 'every-occurrence', label: 'Every Occurrence' },
        { value: 'earliest-occurrence', label: 'Earliest Occurrence' },
        { value: 'latest-occurrence', label: 'Latest Occurrence' },
      ],
    },
    {
      key: 'loop-depth',
      name: 'Loop Depth',
      type: 'number' as const,
      value: 1,
      description:
        'Maximum number of loop iterations to process. Only used in every-occurrence and latest-occurrence modes. Minimum value is 0 which means no loops are processed.',
    },
    {
      key: 'show-loop-icons',
      name: 'Show Loop Detection Icons',
      type: 'boolean' as const,
      value: true,
      description:
        'Show warning icons for elements that are part of loops or where flow traversal was cut off. Relevant for every-occurrence and latest-occurrence modes.',
    },
    // Ghost Elements
    {
      key: 'show-ghost-elements',
      name: 'Show Ghost Occurrences',
      type: 'boolean' as const,
      value: false,
      description:
        'Show semi-transparent elements for alternative timing occurrences in earliest/latest modes.',
    },
    {
      key: 'show-ghost-dependencies',
      name: 'Show Ghost Dependencies',
      type: 'boolean' as const,
      value: false,
      description:
        'Show dependencies connecting to ghost elements. Only available when "Show Ghost Occurrences" is enabled.',
    },
    // Advanced Options
    {
      key: 'render-gateways',
      name: 'Render Gateways as Milestones',
      type: 'boolean' as const,
      value: false,
      description:
        'When enabled, gateways are rendered as milestones in the timeline instead of being preprocessed into direct dependencies.',
    },
    {
      key: 'chronological-sorting',
      name: 'Chronological Sorting',
      type: 'boolean' as const,
      value: false,
      description: 'Sort Gantt tasks chronologically within their connected flow groups.',
    },
    // Visual Enhancements
    {
      key: 'curved-dependencies',
      name: 'Curved Dependencies',
      type: 'boolean' as const,
      value: false,
      description:
        'Use curved lines for dependency arrows instead of straight edges for a more organic appearance.',
    },
  ],
};
