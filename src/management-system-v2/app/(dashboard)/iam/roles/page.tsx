import Auth from '@/components/auth';
import RolesPage from './role-page';

export default Auth(
  {
    action: 'manage',
    resource: 'Role',
    fallbackRedirect: '/',
  },
  RolesPage,
);
