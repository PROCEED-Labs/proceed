import React from 'react';
import { Checkbox, Select, InputNumber, Collapse, Typography } from 'antd';
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

    // Find the positioning logic setting
    const positioningLogicSetting = settingsGroup.children.find(
      (child) => child.key === 'positioning-logic',
    ) as Setting;

    const isEveryOccurrenceMode = positioningLogicSetting.value === 'every-occurrence';

    // For ghost dependencies, also check if ghost elements are enabled and not in every-occurrence mode
    if (key === 'gantt-view.show-ghost-dependencies') {
      const showGhostElementsSetting = settingsGroup.children.find(
        (child) => child.key === 'show-ghost-elements',
      ) as Setting;

      const ghostElementsEnabled = showGhostElementsSetting.value;
      const disabled = !mainEnabled || !ghostElementsEnabled || isEveryOccurrenceMode;

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

    // For ghost elements setting, disable when in every-occurrence mode
    if (key === 'gantt-view.show-ghost-elements') {
      const disabled = !mainEnabled || isEveryOccurrenceMode;

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

    // For all other boolean settings, only check main enabled flag
    if (setting.type === 'boolean') {
      const disabled = !mainEnabled;

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
                      <span style={{ fontSize: '12px', color: '#666' }}>Mode Descriptions</span>
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

    // For number settings
    if (setting.type === 'number') {
      const disabled = !mainEnabled;

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
