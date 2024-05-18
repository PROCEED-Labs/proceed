import { getCurrentUser } from '@/components/auth';
import CreateOrganizationPage from './client-page';
import { getProviders } from '../api/auth/[...nextauth]/auth-options';
import { UserOrganizationEnvironmentInput } from '@/lib/data/environment-schema';
import { addEnvironment } from '@/lib/data/legacy/iam/environments';
import { userError } from '@/lib/user-error';

async function createNotActiveEnvironment(data: UserOrganizationEnvironmentInput) {
  'use server';
  const user = await getCurrentUser();
  if (user.session?.user && !user.session?.user.guest)
    return userError('This function is only for guest users and users that are not signed in');
  return addEnvironment({ ...data, organization: true, active: false });
}

export type createNotActiveEnvironment = typeof createNotActiveEnvironment;

const Page = async () => {
  const { session } = await getCurrentUser();
  const needsToAuthenticate = !session?.user || session?.user.guest;
  const isGuest = session?.user.guest;

  let providers = getProviders();

  providers = providers.filter(
    (provider) => !isGuest || !['guest-signin', 'development-users'].includes(provider.id),
  );

  providers = providers.sort((a, b) => {
    if (a.type === 'email') {
      return -2;
    }
    if (a.type === 'credentials') {
      return -1;
    }

    return 1;
  });

  return (
    <div
      style={{
        height: '100vh',
      }}
    >
      <CreateOrganizationPage
        needsToAuthenticate={needsToAuthenticate}
        providers={!needsToAuthenticate ? undefined : providers}
        createNotActiveEnvironment={createNotActiveEnvironment}
      />
    </div>
  );
};
export default Page;
