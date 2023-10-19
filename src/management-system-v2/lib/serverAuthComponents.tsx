import 'server-only';

import { ComponentProps, FC } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { AuthCan, AuthCanProps } from './clientAuthComponents';
import { nextAuthOptions } from '@/app/api/auth/[...nextauth]/route';

// NOTE redirect doesn't work inside async server components https://github.com/vercel/next.js/issues/42556
// although it should, this is just a silly workaround
function RedirectWrapper({ redirectUrl }: { redirectUrl: string | null }) {
  if (redirectUrl) redirect(redirectUrl);

  return <> </>;
}

export default function Auth(authOptions: AuthCanProps, Component: FC<any>) {
  async function wrappedComponent(props: ComponentProps<typeof Component>) {
    const session = await getServerSession(nextAuthOptions);

    return (
      <>
        <RedirectWrapper
          redirectUrl={
            !session && authOptions.fallbackRedirect ? authOptions.fallbackRedirect : null
          }
        />
        <AuthCan {...authOptions}>
          <Component {...props} />
        </AuthCan>
      </>
    );
  }

  return wrappedComponent;
}
