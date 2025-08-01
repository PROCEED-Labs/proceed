'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Tooltip } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useEnvironment } from '@/components/auth-can';
import { SettingsGroup } from '../../app/(dashboard)/[environmentId]/settings/components';
import { debouncedSettingsUpdate } from '../../app/(dashboard)/[environmentId]/settings/utils';
import { getSpaceSettingsValues } from '@/lib/data/space-settings';
import { isUserErrorResponse } from '@/lib/user-error';
import { ganttViewSettingsDefinition } from './gantt-settings-definition';
import { createGanttSettingsRenderer } from './gantt-settings-utils';
import type { SettingGroup } from '../../app/(dashboard)/[environmentId]/settings/type-util';

interface GanttSettingsModalProps {
  onSettingsChange?: () => void;
}

export const GanttSettingsModal: React.FC<GanttSettingsModalProps> = ({ onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsGroup, setSettingsGroup] = useState<SettingGroup>(ganttViewSettingsDefinition);
  const [isLoading, setIsLoading] = useState(false);
  const { spaceId } = useEnvironment();

  // Load current settings when modal opens
  useEffect(() => {
    const loadSettings = async () => {
      if (!isOpen || !spaceId) return;

      setIsLoading(true);
      try {
        const currentSettings = await getSpaceSettingsValues(spaceId, 'process-documentation');

        // Handle userError result from server action
        if (isUserErrorResponse(currentSettings)) {
          console.error('Settings error:', currentSettings.error.message);
          setIsLoading(false);
          return;
        }

        const ganttViewSettings = currentSettings?.['gantt-view'] || {};

        // Manually populate the settings group with current values
        const populatedGroup = populateSettingsGroupFromValues(
          ganttViewSettingsDefinition,
          ganttViewSettings,
        );
        setSettingsGroup(populatedGroup);
      } catch (error) {
        console.error('Failed to load gantt settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isOpen, spaceId]);

  const handleGroupUpdate = (updatedGroup: SettingGroup) => {
    // Update local state immediately for responsive UI
    setSettingsGroup(updatedGroup);
  };

  const handleNestedSettingUpdate = async (key: string, value: any) => {
    if (!spaceId) return;

    try {
      // Debounced update to database
      // The key already includes the full path from SettingsGroup, just add the process-documentation prefix
      const dbKey = `process-documentation.${key}`;
      await debouncedSettingsUpdate(spaceId, dbKey, value);

      // Notify parent component of settings change
      onSettingsChange?.();
    } catch (error) {
      console.error('Failed to update gantt setting:', error);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    // Reset to original settings on cancel by reloading
    if (spaceId) {
      const loadSettings = async () => {
        try {
          const settingsResult = await getSpaceSettingsValues(spaceId, 'process-documentation');

          // Handle userError result from server action
          if (isUserErrorResponse(settingsResult)) {
            console.error('Settings error:', settingsResult.error.message);
            return;
          }

          const ganttViewSettings = settingsResult?.['gantt-view'] || {};
          const populatedGroup = populateSettingsGroupFromValues(
            ganttViewSettingsDefinition,
            ganttViewSettings,
          );
          setSettingsGroup(populatedGroup);
        } catch (error) {
          console.error('Failed to reload settings on cancel:', error);
        }
      };
      loadSettings();
    }
  };

  return (
    <>
      <Tooltip title="Gantt Settings">
        <Button
          icon={<SettingOutlined />}
          onClick={() => setIsOpen(true)}
          style={{
            width: '32px',
            height: '32px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </Tooltip>

      <Modal
        title="Gantt View Settings"
        open={isOpen}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnClose
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading settings...</div>
        ) : (
          <SettingsGroup
            group={settingsGroup}
            onUpdate={handleGroupUpdate}
            onNestedSettingUpdate={handleNestedSettingUpdate}
            renderNestedSettingInput={createGanttSettingsRenderer(settingsGroup)}
            hideTitle={true}
          />
        )}
      </Modal>
    </>
  );
};

// Helper function to populate settings group with current values from database
function populateSettingsGroupFromValues(
  group: SettingGroup,
  values: Record<string, any>,
): SettingGroup {
  return {
    ...group,
    children: group.children.map((child) => {
      if ('children' in child) {
        // It's a nested group
        return populateSettingsGroupFromValues(child, values);
      } else {
        // It's a setting - use saved value if available, otherwise use default
        const savedValue = values[child.key];
        return {
          ...child,
          value: savedValue !== undefined ? savedValue : child.value,
        };
      }
    }),
  };
}
