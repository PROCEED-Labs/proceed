import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { Skeleton } from 'antd';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getMSConfig, updateMSConfig, writeDefaultMSConfig } from '@/lib/ms-config/ms-config';
import MSConfigForm from './ms-config-form';
import { userError } from '@/lib/server-error-handling/user-error';
import { SettingGroup } from '@/app/(dashboard)/[environmentId]/settings/type-util';

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
    return userError('Error writing default values');
  }
}
export type restoreDefaultValues = typeof restoreDefaultValues;

async function ConfigPage() {
  const user = await getCurrentUser();
  if (!user.session || !user.systemAdmin) redirect('/');

  const _msConfig = await getMSConfig();

  // TODO: remove this once all keys in the schema are renamed
  const msConfig = _msConfig as any;

  const configs: SettingGroup[] = [
    {
      name: 'General',
      key: 'msconfig-general',
      children: [
        {
          type: 'string',
          name: 'PROCEED_PUBLIC_GENERAL_MS_LOGO',
          key: 'PROCEED_PUBLIC_GENERAL_MS_LOGO',
          value: msConfig.PROCEED_PUBLIC_GENERAL_MS_LOGO,
        },
      ],
    },
    {
      name: 'Process Documentation',
      key: 'msconfig-process-documentation',
      children: [
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE',
          key: 'PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE,
        },
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_GANTT_ACTIVE',
          key: 'PROCEED_PUBLIC_GANTT_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_GANTT_ACTIVE,
        },
      ],
    },
    {
      name: 'Process Automation',
      key: 'msconfig-process-automation',
      children: [
        //TODO
        // Process Modeling Style Rules (no Env Var): rule list with checkboxes (popup-modal)
        // Process Import Validation Rules (no Env Var): rule list with checkboxes (popup-modal)
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE',
          key: 'PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE,
        },
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_CONFIG_SERVER_ACTIVE',
          key: 'PROCEED_PUBLIC_CONFIG_SERVER_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_CONFIG_SERVER_ACTIVE,
        },
      ],
    },
    {
      name: 'NODE ENV',
      key: 'msconfig-node-env',
      children: [{ type: 'string', name: 'NODE_ENV', key: 'NODE_ENV', value: msConfig.NODE_ENV }],
    },
    {
      name: 'NEXTAUTH_URL',
      key: 'msconfig-nextauth-url',
      children: [
        { type: 'string', name: 'NEXTAUTH_URL', key: 'NEXTAUTH_URL', value: msConfig.NEXTAUTH_URL },
      ],
    },
    {
      name: 'DATABASE_URL',
      key: 'msconfig-database-url',
      children: [
        { type: 'string', name: 'DATABASE_URL', key: 'DATABASE_URL', value: msConfig.DATABASE_URL },
      ],
    },
    {
      // TODO: dependencies between env vars
      name: 'PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV',
      key: 'msconfig-storage',
      children: [
        {
          type: 'string',
          name: 'PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV',
          key: 'PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV',
          value: msConfig.PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV,
        },
        {
          type: 'string',
          name: 'STORAGE_CLOUD_BUCKET_NAME',
          key: 'STORAGE_CLOUD_BUCKET_NAME',
          value: msConfig.STORAGE_CLOUD_BUCKET_NAME,
        },
        {
          type: 'string',
          name: 'STORAGE_CLOUD_BUCKET_CREDENTIALS',
          key: 'STORAGE_CLOUD_BUCKET_CREDENTIALS',
          value: msConfig.STORAGE_CLOUD_BUCKET_CREDENTIALS,
        },
      ],
    },
    {
      name: 'Mail Server',
      key: 'msconfig-mailserver',
      children: [
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_MAILSERVER_ACTIVE',
          key: 'PROCEED_PUBLIC_MAILSERVER_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_MAILSERVER_ACTIVE,
        },
        {
          type: 'string',
          name: 'MAILSERVER_URL',
          key: 'MAILSERVER_URL',
          value: msConfig.MAILSERVER_URL,
        },
        {
          type: 'string',
          name: 'MAILSERVER_PORT',
          key: 'MAILSERVER_PORT',
          value: msConfig.MAILSERVER_PORT,
        },
        {
          type: 'string',
          name: 'MAILSERVER_MS_DEFAULT_MAIL_ADDRESS',
          key: 'MAILSERVER_MS_DEFAULT_MAIL_ADDRESS',
          value: msConfig.MAILSERVER_MS_DEFAULT_MAIL_ADDRESS,
        },
        {
          type: 'string',
          name: 'MAILSERVER_MS_DEFAULT_MAIL_PASSWORD',
          key: 'MAILSERVER_MS_DEFAULT_MAIL_PASSWORD',
          value: msConfig.MAILSERVER_MS_DEFAULT_MAIL_PASSWORD,
        },
      ],
    },
    {
      name: 'PROCEED_PUBLIC_IAM_ACTIVE',
      key: 'msconfig-iam',
      children: [
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_IAM_ACTIVE',
          key: 'PROCEED_PUBLIC_IAM_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_IAM_ACTIVE,
        },
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE',
          key: 'PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE,
        },
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE',
          key: 'PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE,
        },
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE',
          key: 'PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE',
          value: msConfig.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE,
        },
        {
          type: 'boolean',
          name: 'PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE',
          key: 'PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE',
          value: msConfig.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE,
        },
        {
          name: 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE',
          key: 'msconfig-iam-oauth-google',
          children: [
            {
              type: 'boolean',
              name: 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE',
              key: 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE',
              value: msConfig.PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE,
            },
            {
              type: 'string',
              name: 'IAM_LOGIN_OAUTH_GOOGLE_CLIENT_ID',
              key: 'IAM_LOGIN_OAUTH_GOOGLE_CLIENT_ID',
              value: msConfig.IAM_LOGIN_OAUTH_GOOGLE_CLIENT_ID,
            },
            {
              type: 'string',
              name: 'IAM_LOGIN_OAUTH_GOOGLE_CLIENT_SECRET',
              key: 'IAM_LOGIN_OAUTH_GOOGLE_CLIENT_SECRET',
              value: msConfig.IAM_LOGIN_OAUTH_GOOGLE_CLIENT_SECRET,
            },
          ],
        },
        {
          name: 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE',
          key: 'msconfig-iam-oauth-x',
          children: [
            {
              type: 'string',
              name: 'IAM_LOGIN_OAUTH_X_CLIENT_ID',
              key: 'IAM_LOGIN_OAUTH_X_CLIENT_ID',
              value: msConfig.IAM_LOGIN_OAUTH_X_CLIENT_ID,
            },
            {
              type: 'string',
              name: 'IAM_LOGIN_OAUTH_X_CLIENT_SECRET',
              key: 'IAM_LOGIN_OAUTH_X_CLIENT_SECRET',
              value: msConfig.IAM_LOGIN_OAUTH_X_CLIENT_SECRET,
            },
          ],
        },
        {
          name: 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_DISCORD_ACTIVE',
          key: 'msconfig-iam-oauth-discord',
          children: [
            {
              type: 'string',
              name: 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE',
              key: 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE',
              value: msConfig.PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE,
            },
            {
              type: 'string',
              name: 'IAM_LOGIN_OAUTH_DISCORD_CLIENT_ID',
              key: 'IAM_LOGIN_OAUTH_DISCORD_CLIENT_ID',
              value: msConfig.IAM_LOGIN_OAUTH_DISCORD_CLIENT_ID,
            },
            {
              type: 'string',
              name: 'IAM_LOGIN_OAUTH_DISCORD_CLIENT_SECRET',
              key: 'IAM_LOGIN_OAUTH_DISCORD_CLIENT_SECRET',
              value: msConfig.IAM_LOGIN_OAUTH_DISCORD_CLIENT_SECRET,
            },
          ],
        },
      ],
    },
    {
      name: 'Scheduler',
      key: 'msconfig-scheduler',
      children: [
        {
          type: 'string',
          name: 'SCHEDULER_TOKEN',
          key: 'SCHEDULER_TOKEN',
          value: msConfig.SCHEDULER_TOKEN,
        },
        {
          type: 'string',
          name: 'SCHEDULER_INTERVAL',
          key: 'SCHEDULER_INTERVAL',
          value: msConfig.SCHEDULER_INTERVAL,
        },
        {
          type: 'boolean',
          name: 'SCHEDULER_JOB_DELETE_INACTIVE_GUESTS',
          key: 'SCHEDULER_JOB_DELETE_INACTIVE_GUESTS',
          value: msConfig.SCHEDULER_JOB_DELETE_INACTIVE_GUESTS,
        },
        {
          type: 'boolean',
          name: 'SCHEDULER_JOB_DELETE_OLD_ARTIFACTS',
          key: 'SCHEDULER_JOB_DELETE_OLD_ARTIFACTS',
          value: msConfig.SCHEDULER_JOB_DELETE_OLD_ARTIFACTS,
        },
      ],
    },
  ];

  return (
    <MSConfigForm
      serverSaveConfig={saveConfig}
      configs={configs}
      restoreDefaultValues={restoreDefaultValues}
      overwrittenByEnv={_msConfig._overwrittenByEnv}
      groupDisablers={[
        {
          groupKey: 'msconfig-iam-oauth-google',
          disablerKey: 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE',
        },
        {
          groupKey: 'msconfig-iam',
          disablerKey: 'PROCEED_PUBLIC_IAM_ACTIVE',
        },
        {
          groupKey: 'msconfig-process-automation',
          disablerKey: 'PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE',
        },
        {
          groupKey: 'msconfig-mailserver',
          disablerKey: 'PROCEED_PUBLIC_MAILSERVER_ACTIVE',
        },
        {
          groupKey: 'PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE',
          disablerKey: 'PROCEED_PUBLIC_MAILSERVER_ACTIVE',
        },
      ]}
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
