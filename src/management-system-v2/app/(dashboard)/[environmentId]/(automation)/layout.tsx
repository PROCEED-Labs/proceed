import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';

type AutomationLayoutProps = {
  params: { environmentId: string };
} & React.PropsWithChildren;

const AutomationsLayout: React.FC<AutomationLayoutProps> = async ({ params, children }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation',
    ability,
  );

  if (automationSettings.active === false) {
    return notFound();
  }

  return <>{children}</>;
};

export default AutomationsLayout;
