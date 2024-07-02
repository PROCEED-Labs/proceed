import { getCurrentEnvironment } from '@/components/auth';
import { Card, Space } from 'antd';
import Content from '@/components/content';
// Card throws a react children error if you don't import Title separately.
import Title from 'antd/es/typography/Title';
import { changeBackendConfig, getBackendConfig } from '@/lib/data/legacy/config';
import { redirect } from 'next/navigation';
import SpaceSettings from './space-settings';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';

const GeneralSettingsPage = async ({ params }: { params: { environmentId: string } }) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  if (!activeEnvironment.isOrganization || !ability.can('manage', 'Environment'))
    return redirect('/');

  const organization = getEnvironmentById(activeEnvironment.spaceId) as OrganizationEnvironment;

  return (
    <Content title="General Management System Settings">
      <Card style={{ margin: 'auto', maxWidth: '45rem' }}>
        <Title level={3}>Organization Profile</Title>
        <SpaceSettings organization={organization} />
      </Card>
    </Content>
  );
};

export default GeneralSettingsPage;
