import Auth from '@/components/auth';
import UserProfile from './user-profile';
import Content from '@/components/content';

export default Auth(
  {
    action: 'view',
    resource: 'User',
    fallbackRedirect: '/',
  },
  () => (
    <Content>
      <UserProfile />
    </Content>
  ),
);
