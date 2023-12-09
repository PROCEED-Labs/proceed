import Auth from '@/lib/serverAuthComponents';
import GeneralSettingsPage from './general-settings-page';

export default Auth(
  {
    action: 'view',
    resource: 'Setting',
    fallbackRedirect: '/',
  },
  GeneralSettingsPage,
);
