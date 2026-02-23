import Content from '@/components/content';
import SettingsPage from '../settings/settings-page';

export default function Layout({
  params,
  organizationSettings,
}: {
  params: Promise<{ environmentId: string }>;
  organizationSettings: React.ReactNode;
}) {
  // TODO: check if the user has the rights to change the settings

  return (
    <Content title="Management">
      <SettingsPage organizationSettings={organizationSettings} />
    </Content>
  );
}
