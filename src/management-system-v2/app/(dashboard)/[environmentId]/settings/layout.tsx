import React from 'react';

import Content from '@/components/content';
import SettingsPage from './settings-page';
import { getCurrentEnvironment } from '@/components/auth';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

export default async function Layout({
  params,
  ...children
}: {
  params: Promise<{ environmentId: string }>;
}) {
  // TODO: check if the user has the rights to change the settings
  const currentSpace = await getCurrentEnvironment((await params).environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }

  return (
    <Content title="Settings">
      <SettingsPage {...children} />
    </Content>
  );
}
