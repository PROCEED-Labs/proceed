import { getCurrentEnvironment } from '@/components/auth';
import { Card } from 'antd';
import Content from '@/components/content';
import SettingsForm from './settings-form';
// Card throws a react children error if you don't import Title separately.
import Title from 'antd/es/typography/Title';
import { changeBackendConfig, getBackendConfig } from '@/lib/data/legacy/config';
import { redirect } from 'next/navigation';

const GeneralSettingsPage = async ({ params }: { params: { environmentId: string } }) => {
  const { ability } = await getCurrentEnvironment(params.environmentId);
  if (!ability.can('view', 'Setting')) return redirect('/');

  const settings = getBackendConfig();

  const updateSettings = async (newSettings: Object) => {
    'use server';
    // TODO: Compare with closure settings to check if someone else changed them
    // in the meantime.
    changeBackendConfig(newSettings);
  };

  return (
    <Content title="General Management System Settings">
      <Card style={{ margin: 'auto', maxWidth: '45rem' }}>
        <Title level={3}>System Settings</Title>
        <SettingsForm settings={settings} updateSettings={updateSettings} />
      </Card>
    </Content>
  );
};

export default GeneralSettingsPage;
