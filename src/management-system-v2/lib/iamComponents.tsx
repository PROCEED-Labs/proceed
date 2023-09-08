'use client';

import { ComponentProps, FC, PropsWithChildren, ReactNode, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Route } from 'next';
import {
  ResourceActionType,
  ResourceType,
} from 'proceed-management-system/src/backend/server/iam/authorization/permissionHelpers';
import { handleOauthCallback, useAuthStore } from './iam';
import { App } from 'antd';

let oneShot = true;
export const AuthCallbackListener: FC = () => {
  const oauthCallback = useAuthStore((store) => store.oauthCallback);
  const router = useRouter();
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    if (oneShot && process.env.NEXT_PUBLIC_USE_AUTH && router) {
      oneShot = false;
      handleOauthCallback()
        .then((authRes) => oauthCallback(authRes))
        .catch(() => {
          oauthCallback(undefined);

          const searchParamas = new URLSearchParams(window.location.href.split('?')[1]);
          if (searchParamas.has('code'))
            // if the url params have 'code' in them, it means the user succesfully logged in and was
            // redirected to the frontend, but something failed with the Oauth callback
            messageApi.open({ type: 'error', content: 'Login failed' });

          if (process.env.NEXT_PUBLIC_USE_AUTH) {
            router.push('/');
          }
        });
    }
  }, [oauthCallback, router, messageApi]);

  return null;
};

type AuthCanProps = PropsWithChildren<{
  action: ResourceActionType | ResourceActionType[];
  resource: ResourceType | ResourceType[];
  fallback?: ReactNode;
  fallbackRedirect?: Route;
}>;

export const AuthCan: FC<AuthCanProps> = ({
  action,
  resource,
  children,
  fallback,
  fallbackRedirect,
}) => {
  const loggedIn = useAuthStore((store) => store.loggedIn);
  const oauthCallbackPerformed = useAuthStore((store) => store.oauthCallbackPerformed);
  const ability = useAuthStore((store) => store.ability);
  const router = useRouter();

  const allow = useMemo(() => {
    if (!loggedIn || !oauthCallbackPerformed) return false;

    const resources = Array.isArray(resource) ? resource : [resource];
    const actions = Array.isArray(action) ? action : [action];

    for (const r of resources) {
      for (const a of actions) {
        if (!ability.can(a, r)) return false;
      }
    }

    return true;
  }, [action, resource, loggedIn, oauthCallbackPerformed, ability]);

  if (!process.env.NEXT_PUBLIC_USE_AUTH || allow) return children;

  if (fallbackRedirect && oauthCallbackPerformed) router.push(fallbackRedirect);

  if (!oauthCallbackPerformed) return null;

  return fallback || null;
};

export function Auth(authOptions: AuthCanProps, Component: FC) {
  function wrappedComponent(props: ComponentProps<typeof Component>) {
    return (
      <AuthCan {...authOptions}>
        <Component {...props} />
      </AuthCan>
    );
  }

  return wrappedComponent;
}
