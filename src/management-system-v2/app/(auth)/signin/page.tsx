import { getProviders } from '@/lib/auth';
import { getCurrentUser } from '@/components/auth';
import { notFound, redirect } from 'next/navigation';
import SignIn from './signin';
import { generateGuestReferenceToken } from '@/lib/reference-guest-user-token';
import { env } from '@/lib/ms-config/env-vars';
import db from '@/lib/data/db';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const dayInMS = 1000 * 60 * 60 * 24;

// take in search query
const SignInPage = async (props: { searchParams: Promise<{ callbackUrl: string }> }) => {
  const searchParams = await props.searchParams;
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    // this shouldn't really occur since it is handled in the layout file in the parent folder
    // already
    return notFound();
  }
  const { session } = currentUser.value;
  const isGuest = session?.user.isGuest;

  if (session?.user && !isGuest) {
    const callbackUrl = searchParams.callbackUrl ?? `/${session.user.id}/processes`;
    redirect(callbackUrl);
  }

  // NOTE: expiration should be the same as the expiration for sign in mails
  const guestReferenceToken = isGuest
    ? generateGuestReferenceToken({ guestId: session.user.id }, new Date(Date.now() + dayInMS))
    : undefined;

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

  let userType;
  if (!session) userType = 'none' as const;
  else userType = isGuest ? ('guest' as const) : ('user' as const);

  let logoUrl;
  if (env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE) {
    const org = await db.space.findFirst({
      where: {
        isOrganization: true,
      },
      select: {
        spaceLogo: true,
      },
    });
    // TODO: show url if it's not in the public directory
    if (org?.spaceLogo?.startsWith('public/')) {
      logoUrl = org.spaceLogo.replace('public/', '/');
    }
  }

  return (
    <SignIn
      providers={providers}
      userType={userType}
      guestReferenceToken={guestReferenceToken}
      logoUrl={logoUrl}
    />
  );
};

export default SignInPage;

export const dynamic = 'force-dynamic';
