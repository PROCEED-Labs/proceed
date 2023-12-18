import Auth from '@/components/auth';
import UsersPage from './users-page';

export default Auth(
  {
    action: 'manage',
    resource: 'User',
    fallbackRedirect: '/',
  },
  UsersPage,
);
