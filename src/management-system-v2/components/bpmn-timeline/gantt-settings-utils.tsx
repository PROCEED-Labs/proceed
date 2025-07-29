import React from 'react';
import { Checkbox, Select, InputNumber, Collapse, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { SettingDescription } from '../../app/(dashboard)/[environmentId]/settings/components';
import type {
  SettingGroup,
  Setting,
} from '../../app/(dashboard)/[environmentId]/settings/type-util';

/**
 * Shared renderNestedSettingInput function for gantt settings
 * Implements dependency logic and special UI elements
 */
export function createGanttSettingsRenderer(settingsGroup: SettingGroup) {
  return (id: string, setting: Setting, key: string, onUpdate: (value: any) => void) => {
    // Main "enabled" setting - never disabled
    if (key === 'gantt-view.enabled') {
      return undefined; // Use default rendering
    }

    // Find the main "enabled" setting to check if it's active
    const enabledSetting = settingsGroup.children.find(
      (child) => child.key === 'enabled',
    ) as Setting;

    const mainEnabled = enabledSetting.value;

    // For ghost dependencies, also check if ghost elements are enabled
    if (key === 'gantt-view.show-ghost-dependencies') {
      const showGhostElementsSetting = settingsGroup.children.find(
        (child) => child.key === 'show-ghost-elements',
      ) as Setting;

      const ghostElementsEnabled = showGhostElementsSetting.value;
      const disabled = !mainEnabled || !ghostElementsEnabled;

      return {
        input: (
          <Checkbox
            id={id}
            disabled={disabled}
            checked={setting.value}
            onChange={(e) => onUpdate(e.target.checked)}
          />
        ),
        descriptionRight: <SettingDescription description={setting.description} position="right" />,
      };
    }

    // For all other boolean settings, check main enabled flag and specific dependencies
    if (setting.type === 'boolean') {
      let disabled = !mainEnabled;

      // For loop icons, also disable when earliest occurrence is selected
      if (key === 'gantt-view.show-loop-icons') {
        const positioningLogicSetting = settingsGroup.children.find(
          (child) => child.key === 'positioning-logic',
        ) as Setting;

        const isEarliestOccurrence = positioningLogicSetting.value === 'earliest-occurrence';
        disabled = disabled || isEarliestOccurrence;
      }

      return {
        input: (
          <Checkbox
            id={id}
            disabled={disabled}
            checked={setting.value}
            onChange={(e) => onUpdate(e.target.checked)}
          />
        ),
        descriptionRight: <SettingDescription description={setting.description} position="right" />,
      };
    }

    // For select settings - special handling for positioning logic
    if (setting.type === 'select') {
      const disabled = !mainEnabled;

      // Add info box for positioning logic
      if (key === 'gantt-view.positioning-logic') {
        return {
          input: (
            <div>
              <Select
                id={id}
                disabled={disabled}
                value={setting.value}
                options={setting.options}
                onChange={(val) => onUpdate(val)}
                style={{ width: '100%' }}
              />
              <Collapse
                size="small"
                ghost
                style={{ marginTop: '8px' }}
                items={[
                  {
                    key: 'positioning-modes-info',
                    label: (
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        <InfoCircleOutlined style={{ marginRight: '4px' }} />
                        Mode Descriptions
                      </span>
                    ),
                    children: (
                      <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        <Typography.Text strong>Every Occurrence:</Typography.Text>
                        <div style={{ marginBottom: '8px' }}>
                          Shows all possible execution paths. Elements can appear multiple times
                          with different timings.
                        </div>

                        <Typography.Text strong>Earliest Occurrence:</Typography.Text>
                        <div style={{ marginBottom: '8px' }}>
                          Shows the fastest possible execution. Each element appears once at its
                          earliest time.
                        </div>

                        <Typography.Text strong>Latest Occurrence:</Typography.Text>
                        <div>
                          Shows worst-case scenario. Each element appears once at its latest
                          possible time.
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          ),
          descriptionTop: <SettingDescription description={setting.description} position="top" />,
        };
      }

      // Default select rendering for other select settings
      return {
        input: (
          <Select
            id={id}
            disabled={disabled}
            value={setting.value}
            options={setting.options}
            onChange={(val) => onUpdate(val)}
            style={{ width: '100%' }}
          />
        ),
        descriptionTop: <SettingDescription description={setting.description} position="top" />,
      };
    }

    // For number settings - special handling for loop depth
    if (setting.type === 'number') {
      let disabled = !mainEnabled;

      // For loop depth, also disable when earliest occurrence is selected
      if (key === 'gantt-view.loop-depth') {
        const positioningLogicSetting = settingsGroup.children.find(
          (child) => child.key === 'positioning-logic',
        ) as Setting;

        const isEarliestOccurrence = positioningLogicSetting.value === 'earliest-occurrence';
        disabled = disabled || isEarliestOccurrence;
      }

      return {
        input: (
          <InputNumber
            id={id}
            disabled={disabled}
            value={setting.value}
            onChange={(val) => onUpdate(val)}
            style={{ width: '100%' }}
          />
        ),
        descriptionTop: <SettingDescription description={setting.description} position="top" />,
      };
    }

    // Use default rendering for unhandled types
    return undefined;
  };
}
