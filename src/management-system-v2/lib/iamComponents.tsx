'use client';

import {
  ComponentProps,
  FC,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { Route } from 'next';
import {
  ResourceActionType,
  ResourceType,
} from 'proceed-management-system/src/backend/server/iam/authorization/permissionHelpers';
import { handleOauthCallback, useAuthStore } from './iam';
import { App } from 'antd';

export const AuthCallbackListener: FC = () => {
  const oauthCallback = useAuthStore((store) => store.oauthCallback);
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const callbackPerformed = useRef(false);

  const removeAuthCallbackParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('code');
    params.delete('state');

    router.replace(
      `${new URL(window.location.pathname, window.location.origin)}?${params.toString()}`,
    );
  }, [router]);

  useEffect(() => {
    if (!callbackPerformed.current && process.env.NEXT_PUBLIC_USE_AUTH && router) {
      callbackPerformed.current = true;
      handleOauthCallback()
        .then((authRes) => oauthCallback(authRes))
        .then(removeAuthCallbackParams)
        .catch((e) => {
          oauthCallback(undefined);

          const searchParamas = new URLSearchParams(window.location.search);

          // if the url params have 'code' in them, it means the user succesfully logged in and was
          // redirected to the frontend, but something failed with the Oauth callback
          if (searchParamas.has('code'))
            messageApi.open({ type: 'error', content: 'Login failed' });

          removeAuthCallbackParams();
          router.push('/');
        });
    }
  }, [oauthCallback, router, messageApi, removeAuthCallbackParams]);

  return null;
};

export type AuthCanProps = PropsWithChildren<{
  action: ResourceActionType | ResourceActionType[];
  resource: ResourceType | ResourceType[];
  notLoggedIn?: ReactNode;
  fallback?: ReactNode;
  fallbackRedirect?: Route;
  loading?: ReactNode;
}>;

export const AuthCan: FC<AuthCanProps> = ({
  action,
  resource,
  children,
  fallback,
  fallbackRedirect,
  loading: loadingAuth,
  notLoggedIn,
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

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_USE_AUTH) return;

    if (fallbackRedirect && oauthCallbackPerformed && !allow) {
      /* TODO: fix this, push dosn't work without the timeout */
      setTimeout(() => router.push(fallbackRedirect), 0);
    }
  }, [fallbackRedirect, oauthCallbackPerformed, allow, router]);

  if (!process.env.NEXT_PUBLIC_USE_AUTH) return children;

  if (!oauthCallbackPerformed) return loadingAuth || null;

  if (allow) return children;

  if (!loggedIn && notLoggedIn) return notLoggedIn;

  return fallback || null;
};
