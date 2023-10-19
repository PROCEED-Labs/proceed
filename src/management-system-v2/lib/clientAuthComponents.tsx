'use client';

import { ReactElement, useEffect, useMemo } from 'react';
import { useAbilityStore } from './abilityStore';
import { useSession } from 'next-auth/react';
import { Route } from 'next';
import { AbilityRule, ResourceActionType, ResourceType } from './ability/caslAbility';
import { PackedRulesForUser } from 'proceed-management-system/src/backend/server/iam/authorization/caslRules';
import { PackRule } from '@casl/ability/extra';

export type AuthCanProps = {
  action: ResourceActionType | ResourceActionType[];
  resource: ResourceType | ResourceType[];
  notLoggedIn?: ReactElement;
  fallback?: ReactElement;
  fallbackRedirect?: Route;
  loading?: ReactElement;
};

const API_URL = process.env.API_URL;

export const FetchAbility = () => {
  const { status } = useSession();
  const setAbility = useAbilityStore((store) => store.setAbility);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch(`${API_URL}/ability`, { credentials: 'include' })
        .then((r) => r.json())
        .then(({ rules }: { rules: PackRule<AbilityRule>[] }) => setAbility(rules));
    }
  }, [status, setAbility]);

  return <></>;
};

export const AuthCan = ({
  action,
  resource,
  fallback,
  loading: loadingAuth,
  notLoggedIn,
  children,
}: Omit<AuthCanProps, 'fallbackRedirect'> & {
  children: ReactElement;
}) => {
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

  if (!process.env.NEXT_PUBLIC_USE_AUTH) return children;

  if (status === 'unauthenticated' && notLoggedIn) return notLoggedIn;
  if (status === 'loading' || !abilityFetched) return loadingAuth || null;
  if (allow) return children;

  return fallback || null;
};
