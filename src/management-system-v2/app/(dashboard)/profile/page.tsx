import UserProfile from '@/components/userProfile';
import Auth from '@/lib/serverAuthComponents';

export default Auth(
  {
    action: 'view',
    resource: 'User',
    fallbackRedirect: '/',
  },
  UserProfile,
);
