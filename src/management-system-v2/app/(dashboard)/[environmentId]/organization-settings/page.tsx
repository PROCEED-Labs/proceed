import { getCurrentEnvironment } from '@/components/auth';
import { Alert, Card, Space } from 'antd';
import Content from '@/components/content';
// Card throws a react children error if you don't import Title separately.
import Title from 'antd/es/typography/Title';
import { redirect } from 'next/navigation';
import SpaceSettings from './space-settings';
import { getEnvironmentById, organizationHasLogo } from '@/lib/data/legacy/iam/environments';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import DeleteOrganizationButton from './delete-organization-button';
import { AuthCan } from '@/components/auth-can';

const GeneralSettingsPage = async ({ params }: { params: { environmentId: string } }) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  if (!activeEnvironment.isOrganization || !ability.can('manage', 'Environment'))
    return redirect('/');

  const organization = getEnvironmentById(activeEnvironment.spaceId) as OrganizationEnvironment;
  const hasLogo = organizationHasLogo(activeEnvironment.spaceId);

  return (
    <Content title="Organization Settings">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card style={{ margin: 'auto', maxWidth: '45rem' }}>
          <Title level={3}>Organization Profile</Title>
          <SpaceSettings organization={{ ...organization, hasLogo }} />
        </Card>

        <AuthCan delete Environment>
          <Card style={{ margin: 'auto', maxWidth: '45rem' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={3}>Delete Organization</Title>
              <Alert
                message="All processes inside this organization will be lost. This action cannot be undone."
                type="error"
                showIcon
              />
              <DeleteOrganizationButton />
            </Space>
          </Card>
        </AuthCan>
      </Space>
    </Content>
  );
};

export default GeneralSettingsPage;
