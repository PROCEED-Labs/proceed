import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import UnauthorizedFallback from '@/components/unauthorized-fallback';

type ExecutionLayoutProps = {
  params: Promise<{ environmentId: string }>;
} & React.PropsWithChildren;

const ExecutionsLayout: React.FC<ExecutionLayoutProps> = async (props) => {
  const params = await props.params;

  const { children } = props;

  const msConfig = await getMSConfig();

  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);

  if (!ability.can('view', 'Execution')) return <UnauthorizedFallback />;

  const exeuctionsSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.executions',
  );

  if (exeuctionsSettings.active === false) {
    return notFound();
  }

  return <>{children}</>;
};

export default ExecutionsLayout;
