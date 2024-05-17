import { getCurrentUser } from '@/components/auth';
import CreateOrganizationPage from './client-page';
import { getProviders } from '../api/auth/[...nextauth]/auth-options';
import { UserOrganizationEnvironmentInput } from '@/lib/data/environment-schema';
import { addEnvironment } from '@/lib/data/legacy/iam/environments';

const Page = async () => {
  const { session } = await getCurrentUser();
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
  const signedIn = !!session;

  async function createNotActiveEnvironment(data: UserOrganizationEnvironmentInput) {
    'use server';

    return addEnvironment({ ...data, organization: true, active: false });
  }

  return (
    <div
      style={{
        height: '100vh',
      }}
    >
      <CreateOrganizationPage
        signedIn={signedIn}
        providers={signedIn ? undefined : providers}
        createNotActiveEnvironment={createNotActiveEnvironment}
      />
    </div>
  );
};
export default Page;
