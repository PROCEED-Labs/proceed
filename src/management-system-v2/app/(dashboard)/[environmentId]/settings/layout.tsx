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
  return (
    <Content title="Settings">
      <SettingsPage {...children} />
    </Content>
  );
}
