import Content from '@/components/content';
import SettingsPage from '../settings/settings-page';

export default function Layout({
  params,
  ...children
}: {
  params: Promise<{ environmentId: string }>;
}) {
  // TODO: check if the user has the rights to change the settings

  return (
    <Content title="Management">
      <SettingsPage {...children} />
    </Content>
  );
}
