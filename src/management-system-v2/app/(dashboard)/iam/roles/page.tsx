import Auth from '@/lib/serverAuthComponents';
import RolesPage from './role-page';

export default Auth(
  {
    action: 'manage',
    resource: 'Role',
    fallbackRedirect: '/',
  },
  RolesPage,
);
