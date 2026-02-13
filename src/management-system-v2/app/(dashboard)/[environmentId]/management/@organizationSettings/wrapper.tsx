'use client';

import React, { useRef, useTransition } from 'react';

import { useState } from 'react';
import { SettingGroup } from '../../settings/type-util';
import { SettingsGroup } from '../../settings/components';
import { useEnvironment } from '@/components/auth-can';
import { Alert } from 'antd';
import { App, Form, Input, Space } from 'antd';
import PhoneInput from '@/components/phone-input';
import { useRouter } from 'next/navigation';
import DeleteOrganizationButton from '@/app/(dashboard)/[environmentId]/management/@organizationSettings/delete-organization-button';
import { updateOrganization as serverUpdateOrganization } from '@/lib/data/environments';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { UserOrganizationEnvironmentInputSchema } from '@/lib/data/environment-schema';

const UPDATE_DEBOUNCE_TIME = 1000;

type WrapperProps = {
  group: SettingGroup;
};

const Wrapper: React.FC<WrapperProps> = ({ group }) => {
  const router = useRouter();
  const { message } = App.useApp();
  const [upToDateGroup, setUpToDateGroup] = useState(group);
  const { spaceId } = useEnvironment();
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const changes = useRef<Record<string, string>>({});

  const [errors, parseInput] = useParseZodErrors(UserOrganizationEnvironmentInputSchema.partial());

  const [updating, startUpdating] = useTransition();
  function updateOrganization() {
    if (Object.keys(errors).length > 0) return;

    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }

    updateTimeout.current = setTimeout(() => {
      startUpdating(async () => {
        try {
          const result = await serverUpdateOrganization(spaceId, changes.current);

          if ('error' in result) throw result.error.message;

          message.open({
            content: 'Organization updated',
            type: 'success',
          });
          router.refresh();
          changes.current = {};
        } catch (e) {
          let content = typeof e === 'string' ? e : 'Something went wrong';

          message.open({ content, type: 'error' });
        }
      });
    }, UPDATE_DEBOUNCE_TIME);
  }

  return (
    <SettingsGroup
      group={upToDateGroup}
      onUpdate={setUpToDateGroup}
      onNestedSettingUpdate={(key, value) => {
        const configKey = key.split('.').at(-1)!;
        changes.current[configKey] = value;
        if (parseInput(changes.current) !== null) updateOrganization();
      }}
      renderNestedSettingInput={(id, setting, _key, onUpdate) => {
        let inputElement;

        if (setting.key === 'contactPhoneNumber') {
          inputElement = (
            <PhoneInput
              id={id}
              value={setting.value as any}
              {...antDesignInputProps(errors, 'contactPhoneNumber')}
              onChange={(e) => onUpdate(e.target.value)}
            />
          );
        }

        if (setting.key === 'deleteOrganization') {
          inputElement = (
            <Space orientation="vertical" id={id}>
              <Alert
                title="All processes inside this organization will be lost. This action cannot be undone."
                type="error"
                showIcon
              />
              <DeleteOrganizationButton />
            </Space>
          );
        }

        if (!inputElement) {
          inputElement = (
            <Input value={setting.value} onChange={(e) => onUpdate(e.target.value)} id={id} />
          );
        }

        return {
          input: (
            <Form.Item
              {...antDesignInputProps(errors, setting.key as any)}
              style={{ marginBottom: 0 }}
            >
              {inputElement}
            </Form.Item>
          ),
        };
      }}
    />
  );
};

export default Wrapper;
