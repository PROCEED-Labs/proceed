import 'server-only';

import { ComponentProps, ComponentType, cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { nextAuthOptions } from '@/app/api/auth/[...nextauth]/route';
import { AuthCan, AuthCanProps } from './auth-can';
import { getAbilityForUser } from '@/lib/authorization/authorization';

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(nextAuthOptions);
  const ability = await getAbilityForUser(session?.user.id || '');

  return { session, ability };
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
