import Auth from '@/lib/serverAuthComponents';
import UsersPage from './users-page';

export default Auth(
  {
    action: 'manage',
    resource: 'User',
    fallbackRedirect: '/',
  },
  UsersPage,
);
