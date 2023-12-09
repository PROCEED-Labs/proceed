import Auth from '@/components/auth';
import Processes from './_page';

export default Auth(
  {
    action: 'view',
    resource: 'Process',
    fallbackRedirect: '/processes',
  },
  Processes,
);
