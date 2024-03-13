import { ComponentProps, ComponentType, cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { AuthCan, AuthCanProps } from './auth-can';
import { getAbilityForUser } from '@/lib/authorization/authorization';
import nextAuthOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { headers } from 'next/headers';
import { URL } from 'url';
import { isMember } from '@/lib/data/legacy/iam/memberships';

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(nextAuthOptions);
  const userId = session?.user.id || '';

  return { session, userId };
});

// TODO: To enable PPR move the session redirect into this function, so it will
// be called when the session is first accessed and everything above can PPR. For
// permissions, each server component should check its permissions anyway, for
// composability.
type PermissionErrorHandling =
  | { action: 'redirect'; redirectUrl?: string }
  | { action: 'throw-error' };
export const getCurrentEnvironment = cache(
  async (
    spaceIdParam: string,
    opts: { permissionErrorHandling: PermissionErrorHandling } = {
      permissionErrorHandling: { action: 'redirect' },
    },
  ) => {
    const { userId } = await getCurrentUser();

    // Use hardcoded environment /my/processes for personal spaces.
    if (spaceIdParam === 'my') {
      // Note: will be undefined for not logged in users
      spaceIdParam = userId;
    }

    const activeSpace = decodeURIComponent(spaceIdParam);

    if (!userId || !isMember(decodeURIComponent(activeSpace), userId)) {
      switch (opts?.permissionErrorHandling.action) {
        case 'throw-error':
          throw new Error('User does not have access to this environment');
        case 'redirect':
        default:
          if (opts.permissionErrorHandling.redirectUrl)
            return redirect(opts.permissionErrorHandling.redirectUrl);
          else if (userId) return redirect(`/processes`);
          //NOTE this needs to be removed for guest users
          else return redirect(`/api/auth/signin`);
      }
    }

    const ability = await getAbilityForUser(userId, activeSpace);

    return {
      ability,
      activeEnvironment: { spaceId: activeSpace, isOrganization: activeSpace !== userId },
    };
  },
);

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
