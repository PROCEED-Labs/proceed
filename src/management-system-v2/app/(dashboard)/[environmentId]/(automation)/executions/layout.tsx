import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';

type ExecutionLayoutProps = {
  params: { environmentId: string };
} & React.PropsWithChildren;

const ExecutionsLayout: React.FC<ExecutionLayoutProps> = async ({ params, children }) => {
  const msConfig = await getMSConfig();

  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);

  const exeuctionsSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.executions',
    ability,
  );

  if (exeuctionsSettings.active === false) {
    return notFound();
  }

  return <>{children}</>;
};

export default ExecutionsLayout;
