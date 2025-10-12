import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';

type DocumentationLayoutProps = {
  params: { environmentId: string };
} & React.PropsWithChildren;

const DocumentationLayout: React.FC<DocumentationLayoutProps> = async ({ params, children }) => {
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
