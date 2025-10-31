import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';

type DocumentationLayoutProps = {
  params: Promise<{ environmentId: string }>;
} & React.PropsWithChildren;

const DocumentationLayout: React.FC<DocumentationLayoutProps> = async (props) => {
  const params = await props.params;

  const { children } = props;

  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) {
    return notFound();
  }

  const { activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation',
  );

  if (automationSettings.active === false || automationSettings.task_editor?.active === false) {
    return notFound();
  }

  return <>{children}</>;
};

export default DocumentationLayout;
