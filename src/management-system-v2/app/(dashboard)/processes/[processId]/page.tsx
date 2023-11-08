import Auth from '@/lib/serverAuthComponents';
import Processes from './_page';

export default Auth(
  {
    action: 'view',
    resource: 'Process',
    fallbackRedirect: '/processes',
  },
  Processes,
);
