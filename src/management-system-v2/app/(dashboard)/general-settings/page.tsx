import Auth from '@/components/auth';
import GeneralSettingsPage from './general-settings-page';

export default Auth(
  {
    action: 'view',
    resource: 'Setting',
    fallbackRedirect: '/',
  },
  GeneralSettingsPage,
);
