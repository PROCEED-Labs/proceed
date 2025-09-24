'use client';

import { wrapServerCall } from '@/lib/wrap-server-call';
import { App, Checkbox, Form, Input, Tooltip, Button } from 'antd';
import { useEffect, useState } from 'react';
import type {
  saveConfig as _serverSaveConfig,
  restoreDefaultValues as _restoreDefaultValues,
} from './page';
import { mSConfigEnvironmentOnlyKeys } from '@/lib/ms-config/config-schema';
import { useRouter } from 'next/navigation';
import { SettingGroup } from '@/app/(dashboard)/[environmentId]/settings/type-util';
import { SettingsGroup } from '@/app/(dashboard)/[environmentId]/settings/components';
import SettingsPage from '@/app/(dashboard)/[environmentId]/settings/settings-page';
import SettingsInjector from '@/app/(dashboard)/[environmentId]/settings/settings-injector';
import settingsStyles from '@/app/(dashboard)/[environmentId]/settings/components.module.scss';

export default function MSConfigForm({
  configs,
  serverSaveConfig,
  restoreDefaultValues,
  overwrittenByEnv,
  groupDisablers,
}: {
  configs: SettingGroup[];
  serverSaveConfig: _serverSaveConfig;
  restoreDefaultValues: _restoreDefaultValues;
  overwrittenByEnv: string[];
  // This probably isn't the best way to do it, but it allows us to have the shape of the config
  // page entirely on the server component
  // !! This breaks if the config for disabling a group isn't first in the group
  groupDisablers: { groupKey: string; disablerKey: string }[];
}) {
  const app = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();

  const [localChanges, setLocalChanges] = useState(configs);

  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [changedValues, setChangedValues] = useState<[key: string, value: string][]>([]);

  async function saveConfig() {
    setSaving(true);

    const values: Record<string, string> = {};
    for (const [key, value] of changedValues) {
      const trimmed = value.trim();
      if (trimmed !== '') values[key] = trimmed;
    }

    await wrapServerCall({
      fn: async () => serverSaveConfig(values),
      onSuccess: () => {
        app.message.success('Config saved');
        setChangedValues([]);
      },
      app,
    });

    setSaving(false);
  }

  async function restoreDefaults() {
    setRestoring(true);
    await wrapServerCall({
      fn: restoreDefaultValues,
      onSuccess: 'Default values restored',
      app,
    });
    router.refresh();
    setRestoring(false);
  }

  useEffect(() => {
    form.resetFields();
  }, [form, configs]);

  // disabled group -> key that disabled the group
  const disabledGroups = new Map<string, string>();

  const group = {} as any;
  for (const idx in localChanges) {
    const configGroup = localChanges[idx];

    group[configGroup.key] = (
      <>
        <SettingsInjector sectionName={configGroup.key} group={configGroup} />
        <SettingsGroup
          group={configGroup}
          onUpdate={(changedGroup) => {
            setLocalChanges((prev) => {
              const clone = [...prev];
              clone[idx] = changedGroup;
              return clone;
            });
          }}
          onNestedSettingUpdate={(key, value) => {
            const configKey = key.split('.').at(-1)!;
            setChangedValues((prev) => [...prev, [configKey, value.toString()]]);
          }}
          renderNestedSettingInput={(id, setting, key) => {
            const pathParts = key.split('.');
            const configKey = pathParts.at(-1)!;

            // Get context for the setting
            const overridden = overwrittenByEnv.includes(configKey);
            const envOnly = mSConfigEnvironmentOnlyKeys.includes(configKey as any);
            const disabledKey = pathParts.find((part) => disabledGroups.get(part));

            // This is needed, for when a key that can disable a group, is part of a group that is
            // disabled
            const parentGroupDisabled = pathParts
              .slice(0, -2) // -2 to avoid the key itself and the group key
              .some((part) => disabledGroups.has(part));

            // Update disabled groups
            const disablers = groupDisablers.filter(({ disablerKey }) => disablerKey === configKey);
            if (disablers && setting.value === false)
              for (const { groupKey, disablerKey } of disablers)
                disabledGroups.set(groupKey, disablerKey);

            // Early return for modifiable settings
            // (keys that disable groups
            if (
              !envOnly &&
              !overridden &&
              !parentGroupDisabled &&
              (!disabledKey || disablers.length > 0)
            )
              return;

            let input;
            if (setting.type === 'boolean') {
              input = <Checkbox id={id} checked={setting.value} disabled />;
            } else {
              input = (
                <Input
                  id={id}
                  value={setting.value}
                  className={settingsStyles.SettingInput}
                  disabled
                />
              );
            }

            let tooltipMessage;
            if (overridden)
              tooltipMessage = 'This config was overridden by an environment variable';
            else if (envOnly)
              tooltipMessage = 'This setting can only be changed through environment variables';
            else if (disabledKey) tooltipMessage = `Disabled by ${disabledGroups.get(disabledKey)}`;

            return {
              input: <Tooltip title={tooltipMessage}>{input}</Tooltip>,
            };
          }}
        />
      </>
    );
  }

  return (
    <>
      <SettingsPage {...group} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'end',
          gap: '.5rem',
          position: 'fixed',
          bottom: '1rem',
          right: '2rem',
        }}
      >
        <Button
          type="default"
          onClick={() =>
            app.modal.confirm({
              title: 'Restore Default Config Values?',
              content: 'This will overwrite the current config values.',
              onOk: restoreDefaults,
            })
          }
          loading={restoring}
        >
          Restore defaults
        </Button>
        <Button
          type="primary"
          disabled={changedValues.length === 0}
          onClick={saveConfig}
          loading={saving}
        >
          Save
        </Button>
      </div>
    </>
  );
}
