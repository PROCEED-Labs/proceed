import React from 'react';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

type DocumentationLayoutProps = {
  params: Promise<{ environmentId: string }>;
} & React.PropsWithChildren;

const DocumentationLayout: React.FC<DocumentationLayoutProps> = async (props) => {
  const params = await props.params;

  const { children } = props;
  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { activeEnvironment } = currentSpace.value;

  const documentationSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-documentation',
  );
  if (documentationSettings.isErr()) {
    return errorResponse(documentationSettings);
  }

  if (
    documentationSettings.value.active === false ||
    documentationSettings.value.editor?.active === false
  ) {
    return notFound();
  }

  return <>{children}</>;
};

export default DocumentationLayout;
