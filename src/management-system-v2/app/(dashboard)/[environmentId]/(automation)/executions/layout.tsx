import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

type ExecutionLayoutProps = {
  params: Promise<{ environmentId: string }>;
} & React.PropsWithChildren;

const ExecutionsLayout: React.FC<ExecutionLayoutProps> = async (props) => {
  const params = await props.params;

  const { children } = props;

  const msConfig = await getMSConfig();

  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { activeEnvironment } = currentSpace.value;

  const executionsSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.executions',
  );
  if (executionsSettings.isErr()) {
    return errorResponse(executionsSettings);
  }

  if (executionsSettings.value.active === false) {
    return notFound();
  }

  return <>{children}</>;
};

export default ExecutionsLayout;
