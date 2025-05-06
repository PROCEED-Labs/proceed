'use client';

import { wrapServerCall } from '@/lib/wrap-server-call';
import { App, Button, Card, Form, Input, Space } from 'antd';
import { useEffect, useState } from 'react';
import type {
  saveConfig as _serverSaveConfig,
  restoreDefaultValues as _restoreDefaultValues,
} from './page';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { configurableMSConfigSchemaKeys } from '@/lib/ms-config/config-schema';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const msConfigSchema = z.object(configurableMSConfigSchemaKeys);

export default function MSConfigForm({
  config,
  overwrittenByEnv,
  serverSaveConfig,
  restoreDefaultValues,
}: {
  config: Record<string, string>;
  overwrittenByEnv: string[];
  serverSaveConfig: _serverSaveConfig;
  restoreDefaultValues: _restoreDefaultValues;
}) {
  const app = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [errors, parseInput] = useParseZodErrors(msConfigSchema);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  async function saveConfig(_values: Record<string, string>) {
    setSubmitting(true);

    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(_values)) {
      const trimmed = value.trim();
      if (trimmed !== '') values[key] = trimmed;
    }

    const valid = parseInput(values);

    if (valid) {
      await wrapServerCall({
        fn: async () => serverSaveConfig(values),
        onSuccess: 'Config saved',
        app,
      });
    }

    setSubmitting(false);
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
  }, [form, config]);

  return (
    <Card>
      <Form initialValues={config} layout="vertical" onFinish={saveConfig} form={form}>
        {Object.keys(config).map((field) => (
          <Form.Item key={field} label={field} name={field} {...antDesignInputProps(errors, field)}>
            <Input disabled={overwrittenByEnv.includes(field)} />
          </Form.Item>
        ))}

        <Space>
          <Button
            type="default"
            loading={restoring}
            onClick={(e) => {
              e.preventDefault();
              app.modal.confirm({
                title: 'Restore default values',
                onOk: restoreDefaults,
              });
            }}
          >
            Restore defaults
          </Button>
          <Button type="primary" loading={submitting} htmlType="submit">
            Save
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
