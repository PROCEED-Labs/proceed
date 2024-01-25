import { ComponentProps, ComponentType, cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { AuthCan, AuthCanProps } from './auth-can';
import { getAbilityForUser } from '@/lib/authorization/authorization';
import { nextAuthOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { headers } from 'next/headers';
import { URL } from 'url';

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(nextAuthOptions);
  const userId = session?.user.id || '';

  return { session, userId };
});

// TODO: To enable PPR move the session redirect into this function, so it will
// be called when the session is first accessed and everything above can PPR. For
// permissions, each server component should check its permissions anyway, for
// composability.
export const getCurrentEnvironment = cache(async (activeEnvironment?: string) => {
  const { userId } = await getCurrentUser();

  if (!activeEnvironment) {
    const url = new URL(headers().get('referer') || '');
    activeEnvironment = url.pathname.split('/')[1];
  }

  activeEnvironment = decodeURIComponent(activeEnvironment);

  const ability = await getAbilityForUser(userId, activeEnvironment);

  return { ability, activeEnvironment };
});

// HOC for server-side auth checking
const Auth = <P extends {}>(authOptions: AuthCanProps, Component: ComponentType<P>) => {
  async function WrappedComponent(props: ComponentProps<ComponentType<P>>) {
    const { session } = await getCurrentUser();

    if (!session && authOptions.fallbackRedirect) {
      redirect(authOptions.fallbackRedirect);
    }

    return (
      <AuthCan {...authOptions}>
        <Component {...props} />
      </AuthCan>
    );
  }

  return WrappedComponent;
};

export default Auth;
