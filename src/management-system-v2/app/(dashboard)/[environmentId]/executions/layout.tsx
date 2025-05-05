import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { env } from '@/lib/env-vars';
import { getCurrentEnvironment } from '@/components/auth';

type ExecutionLayoutProps = {
  params: { environmentId: string };
} & React.PropsWithChildren;

const ExecutionsLayout: React.FC<ExecutionLayoutProps> = async ({ params, children }) => {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation',
    ability,
  );

  if (automationSettings.active === false || automationSettings.executions?.active === false) {
    return notFound();
  }

  return <>{children}</>;
};

export default ExecutionsLayout;
