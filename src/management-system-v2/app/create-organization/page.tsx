import { getCurrentUser } from '@/components/auth';
import CreateOrganizationPage from './client-page';
import { getProviders } from '@/lib/auth';
import { UserOrganizationEnvironmentInput } from '@/lib/data/environment-schema';
import { addEnvironment } from '@/lib/data/legacy/iam/environments';
import { userError } from '@/lib/user-error';

async function createInactiveEnvironment(data: UserOrganizationEnvironmentInput) {
  'use server';
  const user = await getCurrentUser();
  if (user.session?.user && !user.session?.user.isGuest)
    return userError('This function is only for guest users and users that are not signed in');
  return addEnvironment({ ...data, isOrganization: true, isActive: false });
}

export type createInactiveEnvironment = typeof createInactiveEnvironment;

const unallowedProviders = ['guest-signin', 'development-users'];

const Page = async () => {
  const { session } = await getCurrentUser();
  const needsToAuthenticate = !session?.user || session?.user.isGuest;

  let providers = getProviders();

  providers = providers.filter((provider) => !unallowedProviders.includes(provider.id));

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
        providers={needsToAuthenticate ? providers : undefined}
        createInactiveEnvironment={createInactiveEnvironment}
      />
    </div>
  );
};
export default Page;
