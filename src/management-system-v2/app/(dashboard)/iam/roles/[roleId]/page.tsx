import Auth from '@/components/auth';
import RolePage from './role-page';

export default Auth(
  {
    action: ['view', 'manage'],
    resource: 'Role',
    fallbackRedirect: '/',
  },
  RolePage,
);
