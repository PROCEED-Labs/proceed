'use client';

import { wrapServerCall } from '@/lib/wrap-server-call';
import { App, Button, Card, Form, Input } from 'antd';
import { useState } from 'react';
import type { saveConfig as _serverSaveConfig } from './page';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { configurableMSConfigSchemaKeys } from '@/lib/ms-config/config-schema';
import { z } from 'zod';

const msConfigSchema = z.object(configurableMSConfigSchemaKeys);

export default function MSConfigForm({
  config,
  overwrittenByEnv,
  serverSaveConfig,
}: {
  config: Record<string, string>;
  overwrittenByEnv: string[];
  serverSaveConfig: _serverSaveConfig;
}) {
  const [submitting, setSubmitting] = useState(false);
  const app = App.useApp();
  const [errors, parseInput] = useParseZodErrors(msConfigSchema);

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

  return (
    <Card>
      <Form initialValues={config} layout="vertical" onFinish={saveConfig}>
        {Object.keys(config).map((field) => (
          <Form.Item key={field} label={field} name={field} {...antDesignInputProps(errors, field)}>
            <Input disabled={overwrittenByEnv.includes(field)} />
          </Form.Item>
        ))}

        <Button type="primary" loading={submitting} htmlType="submit">
          Save
        </Button>
      </Form>
    </Card>
  );
}
