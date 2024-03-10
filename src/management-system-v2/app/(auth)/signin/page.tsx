import { FC } from 'react';
import Login from './login';
import nextAuthOptions, { getProviders } from '@/app/api/auth/[...nextauth]/auth-options';
import { CredentialInput, OAuthProviderButtonStyles } from 'next-auth/providers';
import { getCurrentUser } from '@/components/auth';
import { redirect } from 'next/navigation';

// take in search query
const LoginPage = async ({ searchParams }: { searchParams: { callbackUrl: string } }) => {
  const { session } = await getCurrentUser();
  // if (session?.user) {
  //   const callbackUrl = searchParams.callbackUrl ?? `/${session.user.id}/processes`;
  //   redirect(callbackUrl);
  // }

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

  return <Login providers={providers} />;
};

export default LoginPage;
