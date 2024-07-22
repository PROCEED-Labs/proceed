import { getProviders } from '@/app/api/auth/[...nextauth]/auth-options';
import { getCurrentUser } from '@/components/auth';
import { redirect } from 'next/navigation';
import SignIn from './signin';

// take in search query
const SignInPage = async ({ searchParams }: { searchParams: { callbackUrl: string } }) => {
  const { session } = await getCurrentUser();
  const isGuest = session?.user.guest;

  if (session?.user && !isGuest) {
    const callbackUrl = searchParams.callbackUrl ?? `/${session.user.id}/processes`;
    redirect(callbackUrl);
  }

  let providers = getProviders();

  providers = providers.toSorted((a, b) => {
    if (a.id === 'guest-signin') return 1;
    if (b.id === 'guest-signin') return -1;

    if (a.type === 'oauth') return 1;
    if (b.type === 'oauth') return -1;

    if (a.id === 'development-users') return -1;
    if (b.id === 'development-users') return 1;

    if (a.type === 'email') return -1;
    if (b.type === 'email') return 1;

    return 0;
  });

  return <SignIn providers={providers} user={session?.user} />;
};

export default SignInPage;
