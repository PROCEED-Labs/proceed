'use client';

import { ReactElement, ReactNode, useEffect, useMemo, FC, PropsWithChildren } from 'react';
import { useAbilityStore } from '@/lib/abilityStore';
import { useSession } from 'next-auth/react';
import { Route } from 'next';
import { AbilityRule, ResourceActionType } from '@/lib/ability/caslAbility';
import { PackRule } from '@casl/ability/extra';
import { useCsrfTokenStore } from '@/lib/csrfTokenStore';
import { useRouter } from 'next/navigation';
import Ability from '@/lib/ability/abilityHelper';

export type AuthCanProps = {
  action: ResourceActionType | ResourceActionType[];
  resource: Parameters<Ability['can']>[1];
  notLoggedIn?: ReactElement;
  fallback?: ReactElement;
  fallbackRedirect?: Route;
  loading?: ReactElement;
};

const API_URL = process.env.API_URL;

export const FetchAbility = () => {
  const setCsrfToken = useCsrfTokenStore((store) => store.setCsrfToken);
  const { status, data } = useSession();
  const setAbility = useAbilityStore((store) => store.setAbility);

  useEffect(() => {
    if (status === 'authenticated') {
      setCsrfToken(data.csrfToken);
      fetch(`${API_URL}/ability`, {
        credentials: 'include',
        headers: { 'x-csrf-token': data.csrfToken },
      })
        .then((r) => r.json())
        .then(({ rules }: { rules: PackRule<AbilityRule>[] }) => setAbility(rules));
    }
  }, [status, setAbility, data, setCsrfToken]);

  return <></>;
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

  const allow = useMemo(() => {
    if (status !== 'authenticated' || !abilityFetched) return false;

    const resources = Array.isArray(resource) ? resource : [resource];
    const actions = Array.isArray(action) ? action : [action];

    for (const r of resources) {
      for (const a of actions) {
        if (!ability.can(a, r)) return false;
      }
    }

    return true;
  }, [action, resource, ability, abilityFetched, status]);

  useEffect(() => {
    if (abilityFetched && !allow && fallbackRedirect) router.push(fallbackRedirect);
  }, [allow, fallbackRedirect, router, abilityFetched]);

  if (!process.env.NEXT_PUBLIC_USE_AUTH) return children;

  if (status === 'unauthenticated' && notLoggedIn) return notLoggedIn;
  if (status === 'loading' || !abilityFetched) return loadingAuth || null;
  if (allow) return children;

  return fallback || null;
};
