import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

type ExecutionLayoutProps = {
  params: { environmentId: string };
} & React.PropsWithChildren;

const ExecutionsLayout: React.FC<ExecutionLayoutProps> = async ({ params, children }) => {
  const msConfig = await getMSConfig();

  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { activeEnvironment } = currentSpace.value;

  const exeuctionsSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.executions',
  );
  if (exeuctionsSettings.isErr()) {
    return errorResponse(exeuctionsSettings);
  }

  if (exeuctionsSettings.value.active === false) {
    return notFound();
  }

  return <>{children}</>;
};

export default ExecutionsLayout;
