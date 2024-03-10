import { getProviders } from '@/app/api/auth/[...nextauth]/auth-options';
import { getCurrentUser } from '@/components/auth';
import { redirect } from 'next/navigation';
import SignIn from './signin';

// take in search query
const SignInPage = async ({ searchParams }: { searchParams: { callbackUrl: string } }) => {
  const { session } = await getCurrentUser();
  if (session?.user) {
    const callbackUrl = searchParams.callbackUrl ?? `/${session.user.id}/processes`;
    redirect(callbackUrl);
  }

  const providers = getProviders();

  providers.sort((a, b) => {
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
