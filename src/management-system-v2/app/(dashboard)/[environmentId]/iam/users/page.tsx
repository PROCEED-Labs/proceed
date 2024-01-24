import Auth, { getCurrentEnvironment } from '@/components/auth';
import UsersPage from './users-page';
import { getUsers } from '@/lib/data/legacy/iam/users';
import Content from '@/components/content';

const Page = async () => {
  const { ability } = await getCurrentEnvironment();
  const users = getUsers(ability);

  return (
    <Content title="Identity and Access Management">
      <UsersPage users={users} />
    </Content>
  );
};

export default Auth(
  {
    action: 'manage',
    resource: 'User',
    fallbackRedirect: '/',
  },
  Page,
);
