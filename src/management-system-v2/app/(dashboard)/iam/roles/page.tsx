import Auth, { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getRoles } from '@/lib/data/legacy/iam/roles';
import RolesPage from './role-page';

const Page = async () => {
  const { ability } = await getCurrentUser();

  const roles = getRoles(ability);

  return (
    <Content title="Identity and Access Management">
      <RolesPage roles={roles} />
    </Content>
  );
};

export default Auth(
  {
    action: 'manage',
    resource: 'Role',
    fallbackRedirect: '/',
  },
  Page,
);

export const dynamic = 'force-dynamic';
