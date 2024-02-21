import { FC } from 'react';
import { getProviders } from 'next-auth/react';
import Login from './login';
import { nextAuthOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { CredentialInput, OAuthProviderButtonStyles } from 'next-auth/providers';
import { getCurrentUser } from '@/components/auth';
import { redirect } from 'next/navigation';

export type ExtractedProvider =
  | {
      id: string;
      type: 'email';
      name: string;
    }
  | {
      id: string;
      type: 'oauth';
      name: string;
      style?: OAuthProviderButtonStyles;
    }
  | {
      id: string;
      type: 'credentials';
      name: string;
      credentials: Record<string, CredentialInput>;
    };

// take in search query
const LoginPage = async ({ searchParams }: { searchParams: { callbackUrl: string } }) => {
  const { session } = await getCurrentUser();
  if (session?.user) {
    const callbackUrl = searchParams.callbackUrl ?? `/${session.user.id}/processes`;
    redirect(callbackUrl);
  }

  // Unfortunatly, next-auth's getProviders() function does not return enough information to render the login page.
  // So we need to manually map the providers
  // NOTE be careful not to leak any sensitive information
  const providers = nextAuthOptions.providers.map((provider) => ({
    id: provider.options?.id ?? provider.id,
    type: provider.type,
    name: provider.name,
    style: provider.type === 'oauth' ? provider.style : undefined,
    credentials: provider.type === 'credentials' ? provider.options.credentials : undefined,
  })) as ExtractedProvider[];

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
