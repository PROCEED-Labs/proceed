import Auth from '@/lib/serverAuthComponents';
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
