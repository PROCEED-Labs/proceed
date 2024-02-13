'use client';

import { ReactElement, ReactNode, useEffect, useMemo, FC, PropsWithChildren } from 'react';
import { useAbilityStore } from '@/lib/abilityStore';
import { useSession } from 'next-auth/react';
import { Route } from 'next';
import { AbilityRule, ResourceActionType } from '@/lib/ability/caslAbility';
import { PackRule } from '@casl/ability/extra';
import { useCsrfTokenStore } from '@/lib/csrfTokenStore';
import { usePathname, useRouter } from 'next/navigation';
import Ability from '@/lib/ability/abilityHelper';

export type AuthCanProps = {
  action: ResourceActionType | ResourceActionType[];
  resource: Parameters<Ability['can']>[1];
  notLoggedIn?: ReactElement;
  fallback?: ReactElement;
  fallbackRedirect?: Route;
  loading?: ReactElement;
};

// TODO: Weil client side werden evtl. sensible Daten an den Client geschickt.
// Auf server side ändern und eigene component für client side die aber nur für
// buttons etc. benutzt werden sollte
export const AuthCan: FC<PropsWithChildren<AuthCanProps>> = ({
  action,
  resource,
  fallback,
  loading: loadingAuth,
  notLoggedIn,
  children,
  fallbackRedirect,
}) => {
  const router = useRouter();
  const { status } = useSession();

  const ability = useAbilityStore((store) => store.ability);
  const abilityFetched = useAbilityStore((store) => store.abilityFetched);

  const loadingState = status === 'loading' || !abilityFetched;

  const allow = useMemo(() => {
    if (status !== 'authenticated' || loadingState) return false;

    const resources = Array.isArray(resource) ? resource : [resource];
    const actions = Array.isArray(action) ? action : [action];

    for (const r of resources) {
      for (const a of actions) {
        if (!ability.can(a, r)) return false;
      }
    }

    return true;
  }, [action, resource, ability, loadingState, status]);

  useEffect(() => {
    if (!loadingState && !allow && fallbackRedirect) {
      router.push(fallbackRedirect);
    }
  }, [allow, fallbackRedirect, router, loadingState]);

  if (!process.env.NEXT_PUBLIC_USE_AUTH) return children;

  if (status === 'unauthenticated' && notLoggedIn) return notLoggedIn;
  if (loadingState) return loadingAuth || null;
  if (allow) return children;

  return fallback || null;
};

export const useEnvironment = () => {
  const pathname = usePathname();
  const environmentId = pathname.split('/')[1];
  return decodeURIComponent(environmentId);
};
