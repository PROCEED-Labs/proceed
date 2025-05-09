import React from 'react';

import Content from '@/components/content';
import SettingsPage from './settings-page';

export default function Layout({
  params,
  ...children
}: {
  params: { environmentId: string };
  children: React.ReactNode[];
}) {
  // TODO: check if the user has the rights to change the settings

  return (
    <Content title="Settings">
      <SettingsPage {...children} />
    </Content>
  );
}
