'use client';

import { ReactElement, useEffect, useMemo, FC, PropsWithChildren } from 'react';
import { useAbilityStore } from '@/lib/abilityStore';
import { useSession } from 'next-auth/react';
import { Route } from 'next';
import {
  ResourceActionType,
  ResourceType,
  resources,
  toCaslResource,
  resourceAction,
} from '@/lib/ability/caslAbility';
import { usePathname, useRouter } from 'next/navigation';

/** Makes at least one key of an object required */
type OneOf<Key, Object> = Key extends keyof Object ? Partial<Object> & Pick<Object, Key> : never;

type ResourceActionOneOf = OneOf<ResourceActionType, Record<ResourceActionType, true>>;

type ResourceParams = Parameters<typeof toCaslResource>;
type ResourceOneOf = OneOf<ResourceType, Record<ResourceType, ResourceParams[1] | true>>;

export type AuthCanProps = ResourceActionOneOf &
  ResourceOneOf & {
    notLoggedIn?: ReactElement;
    fallback?: ReactElement;
    fallbackRedirect?: Route;
    loading?: ReactElement;
  };

/**
 * Component to check if a user is allowed to perform an action on a resource
 *
 * @example
 * <AuthCan create Process={record} fallback={<p>Not allowed</p>}>
 *   <button onClick={createProcess}> Create Process </button>
 * </AuthCan>
 * */
export const AuthCan: FC<PropsWithChildren<AuthCanProps>> = (props) => {
  const { fallback, loading: loadingAuth, notLoggedIn, children, fallbackRedirect } = props;

  const router = useRouter();
  const { status } = useSession();
  const environmentId = useEnvironment();

  const ability = useAbilityStore((store) => store.ability);
  const abilityFetched = useAbilityStore((store) => store.abilityFetched);

  const loadingState = status === 'loading' || !abilityFetched;

  const allow = useMemo(() => {
    if (status !== 'authenticated' || loadingState) return false;

    const selectedResources: (ResourceType | ReturnType<typeof toCaslResource>)[] = [];
    for (const resource of resources) {
      const selectedResource = props[resource];
      if (!selectedResource) continue;

      if (typeof selectedResource === 'boolean') selectedResources.push(resource);
      else selectedResources.push(toCaslResource(resource, selectedResource));
    }
    if (selectedResources.length === 0) throw new Error('No resources were provided');

    const actions: ResourceActionType[] = [];
    for (const action of resourceAction) if (props[action]) actions.push(action);
    if (selectedResources.length === 0) throw new Error('No actions were provided');

    for (const r of selectedResources) {
      for (const a of actions) {
        if (!ability.can(a, r, { environmentId })) return false;
      }
    }

    return true;
  }, [
    ...resources.map((r) => props[r]),
    ...resourceAction.map((a) => props[a]),
    environmentId,
    status,
    loadingState,
  ]);

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
