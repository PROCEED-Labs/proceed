import { getProviders } from '@/app/api/auth/[...nextauth]/auth-options';
import { getCurrentUser } from '@/components/auth';
import { redirect } from 'next/navigation';
import SignIn from './signin';
import { generateGuestReferenceToken } from '@/lib/reference-guest-user-token';

const dayInMS = 1000 * 60 * 60 * 24;

// take in search query
const SignInPage = async ({ searchParams }: AsyncPageProps) => {
  const [{ session }, { callbackUrl }] = await Promise.all([
    await getCurrentUser(),
    await searchParams,
  ]);

  const isGuest = session?.user.isGuest;

  const paramsCallbackUrl = typeof callbackUrl === 'string' ? callbackUrl : callbackUrl?.[0];

  if (session?.user && !isGuest) {
    const callbackUrl = paramsCallbackUrl ?? `/${session.user.id}/processes`;
    redirect(callbackUrl);
  }

  // NOTE: expiration should be the same as the expiration for sign in mails
  const guestReferenceToken = isGuest
    ? generateGuestReferenceToken({ guestId: session.user.id }, new Date(Date.now() + dayInMS))
    : undefined;

  let providers = getProviders();

  providers = providers.filter((provider) => !isGuest || 'development-users' !== provider.id);

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

  let userType;
  if (!session) userType = 'none' as const;
  else userType = isGuest ? ('guest' as const) : ('user' as const);

  return (
    <SignIn providers={providers} userType={userType} guestReferenceToken={guestReferenceToken} />
  );
};

export default SignInPage;
