import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { Skeleton } from 'antd';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  filterMSConfigurableValues,
  getMSConfig,
  getMSConfigDBValues,
  updateMSConfig,
  writeDefaultMSConfig,
} from '@/lib/ms-config/ms-config';
import MSConfigForm from './ms-config-form';
import { userError } from '@/lib/user-error';
import { msConfigConfigurableKeys } from '@/lib/ms-config/config-schema';

async function saveConfig(newConfig: Record<string, string>) {
  'use server';
  try {
    await updateMSConfig(newConfig);
  } catch (e) {
    return userError('Error saving config');
  }
}
export type saveConfig = typeof saveConfig;

async function restoreDefaultValues() {
  'use server';
  try {
    await writeDefaultMSConfig(true);
  } catch (e) {
    console.error(e);
    return userError('Error writing default values');
  }
}
export type restoreDefaultValues = typeof restoreDefaultValues;

async function ConfigPage() {
  const user = await getCurrentUser();
  if (!user.session || !user.systemAdmin) redirect('/');

  const [msConfig, dbConfig] = await Promise.all([getMSConfig(), getMSConfigDBValues()]);
  const config = filterMSConfigurableValues(dbConfig);

  // Overwrite values with env values
  for (const key of msConfig._overwrittenByEnv) {
    config[key] = (process.env[key] as string) || '';
  }

  // Serialization drops keys with undefined values so we make them empty strings
  for (const key of msConfigConfigurableKeys) {
    if (config[key] === undefined) config[key] = '';
  }

  return (
    <MSConfigForm
      serverSaveConfig={saveConfig}
      config={config}
      overwrittenByEnv={msConfig._overwrittenByEnv}
      restoreDefaultValues={restoreDefaultValues}
    />
  );
}

export default function Page() {
  return (
    <Content title="MS Config">
      <Suspense fallback={<Skeleton active />}>
        <ConfigPage />
      </Suspense>
    </Content>
  );
}

export const dynamic = 'force-dynamic';
