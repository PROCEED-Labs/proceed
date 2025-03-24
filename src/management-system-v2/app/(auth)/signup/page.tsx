import { getCurrentUser } from '@/components/auth';
import { notFound, redirect } from 'next/navigation';
import SignupPage from './signup-page';
import { env } from '@/lib/env-vars';

const SignInPage = async ({ searchParams }: { searchParams: { callbackUrl: string } }) => {
  if (!env.ENABLE_PASSWORD_SIGNIN) return notFound();

  const { session } = await getCurrentUser();
  const isGuest = session?.user.isGuest;

  if (session?.user && !isGuest) {
    const callbackUrl = searchParams.callbackUrl ?? `/${session.user.id}/processes`;
    redirect(callbackUrl);
  }

  return <SignupPage />;
};

export default SignInPage;
