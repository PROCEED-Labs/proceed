import { getProviders } from '@/app/api/auth/[...nextauth]/auth-options';
import { getCurrentUser } from '@/components/auth';
import { redirect } from 'next/navigation';
import SignIn from './signin';

const unallowedProviders = ['guest-signin', 'development-users'];

// take in search query
const SignInPage = async ({ searchParams }: { searchParams: { callbackUrl: string } }) => {
  const { session } = await getCurrentUser();
  const isGuest = session?.user.isGuest;

  if (session?.user && !isGuest) {
    const callbackUrl = searchParams.callbackUrl ?? `/${session.user.id}/processes`;
    redirect(callbackUrl);
  }

  let providers = getProviders();

  providers = providers.filter((provider) => !isGuest || !unallowedProviders.includes(provider.id));

  providers = providers.sort((a, b) => {
    if (a.type === 'email') {
      return -2;
    }
    if (a.type === 'credentials') {
      return -1;
    }

    return 1;
  });

  return <SignIn providers={providers} />;
};

export default SignInPage;
