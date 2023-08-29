'use client';

import { create } from 'zustand';
import { createMongoAbility, MongoAbility, RawRuleOf } from '@casl/ability';
// @ts-ignore
import { PERMISSION_MAPPING } from 'proceed-management-system/src/shared-frontend-backend/constants';
import { FC, PropsWithChildren, ReactNode, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Route } from 'next';

const BACKEND_URL = process.env.BACKEND_URL;

// TYPE DEFINITIONS
// ----------------------

const resourceAction = [
  'none',
  'view',
  'update',
  'create',
  'delete',
  'manage',
  'share',
  'manage-roles',
  'manage-groups',
  'manage-password',
  'admin',
] as const;

type ResourceActionType = (typeof resourceAction)[number];

type ResourceActionsMappingType = Record<ResourceActionType, number>;

const ResourceActionsMapping = PERMISSION_MAPPING as ResourceActionsMappingType;

const resources = [
  'Process',
  'Project',
  'Template',
  'Task',
  'Machine',
  'Execution',
  'Role',
  'User',
  'Setting',
  'EnvConfig',
  'All',
] as const;
type ResourceType = (typeof resources)[number];

interface AuthResponse {
  isLoggedIn: boolean;
  config: {
    useAuthorization: boolean;
    allowRegistrations: boolean;
    useSessionManagement: boolean;
  };
  user: any;
  handled: boolean;
  permissions: Partial<Record<ResourceType, { actions: number[]; conditions?: any }>>;
  csrfToken: string;
}

type AbilityType = MongoAbility<[ResourceActionType, ResourceType]>;
type AbilityRuleType = RawRuleOf<AbilityType>;

type AuthStoreType = (
  | ({
      loggedIn: true;
      ability: AbilityType;
    } & Pick<AuthResponse, 'user' | 'csrfToken'>)
  | {
      loggedIn: false;
    }
) & {
  oauthCallback: (obj: AuthResponse) => void;
};

// AUTH STORE
// ----------------------

const needOwnership = new Set<ResourceType>(['Process', 'Project', 'Template']);

function translatePermissions(authResponse: AuthResponse) {
  const permissions = authResponse.permissions;
  const translatedRules: AbilityRuleType[] = [];

  for (const resource of resources) {
    let resourcePermissions = permissions[resource];
    if (resourcePermissions === undefined) continue;

    const actionsSet = new Set<ResourceActionType>();

    // go through all permission numbers for resource
    for (const permission of resourcePermissions.actions) {
      if (permission === 0) {
        actionsSet.add('none');
        continue;
      }

      // go through all actions and see if they're contained in number
      for (let actionIndex = 0; actionIndex < resourceAction.length; actionIndex++) {
        const action = resourceAction[actionIndex];
        const bit = ResourceActionsMapping[action];

        if ((permission & bit) === bit) {
          actionsSet.add(action);
        }
      }
    }

    // TODO handle conditions sent from backend in permissions[resource].conditions

    translatedRules.push({
      action: [...actionsSet.values()],
      subject: resource,
      conditions: needOwnership.has(resource)
        ? {
            owner: { $eq: authResponse.user.sub },
          }
        : undefined,
    });
  }

  return translatedRules;
}

export const useAuthStore = create<AuthStoreType>((set) => ({
  loggedIn: false,
  oauthCallback(obj: AuthResponse) {
    if (obj.isLoggedIn) {
      set(
        {
          loggedIn: true,
          user: obj.user,
          csrfToken: obj.csrfToken,
          ability: createMongoAbility<AbilityType>(translatePermissions(obj), {
            // resolveAction: createAliasResolver({
            //   manage: ['update', 'create', 'delete'],
            // }),
            anyAction: 'admin',
            anySubjectType: 'All',
          }),
        },
        true,
      );
    }
  },
}));

// frontend UTILITIES
// ----------------------
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
  const authStore = useAuthStore();
  const router = useRouter();

  const allow = useMemo(() => {
    if (!authStore.loggedIn) return false;

    const resources = Array.isArray(resource) ? resource : [resource];
    const actions = Array.isArray(action) ? action : [action];

    for (const r of resources) {
      for (const a of actions) {
        if (!authStore.ability.can(a, r)) return false;
      }
    }

    return true;
  }, [action, resource, authStore]);

  if (!process.env.NEXT_PUBLIC_USE_AUTH || allow) return children;

  if (fallbackRedirect) router.push(fallbackRedirect);

  return fallback || null;
};

export const authFetchJSON = async <T>(url: string, options: Parameters<typeof fetch>[1] = {}) => {
  const state = useAuthStore.getState();

  if (!state.loggedIn) throw new Error('Not logged in');

  options.headers = options.headers || new Headers();
  (options.headers as Headers).set('x-csrf-token', state.csrfToken);
  (options.headers as Headers).set('x-csrf', '1');

  options.credentials = process.env.NODE_ENV === 'production' ? 'same-origin' : 'include';

  const response = await fetch(url, { ...options });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json() as Promise<T>;
};

// frontend callback
// ----------------------

const callbackParamsRegex = /.*?code=.+&state=.+/;
let oneShot = true;

export const AuthCallbackListener: FC = () => {
  const authStore = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (oneShot && process.env.NEXT_PUBLIC_USE_AUTH) {
      oneShot = false;
      handleOauthCallback()
        .then((authRes) => authStore.oauthCallback(authRes))
        .catch((e: Error) => alert(`Error: ${e.name}`))
        .finally(() => router.push('/'));
    }
  }, [authStore, router]);

  return null;
};

// SERVER AUTH HELPERS
// ----------------------

export async function logout() {
  window.location.href = `${BACKEND_URL}/logout?returnUrl=${window.location.origin}`;
}

export function login() {
  window.location.href = `${BACKEND_URL}/login?redirectUri=${window.location.origin}`;
}

// after login we should have a session set
export async function handleOauthCallback(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/callback`, {
      method: 'POST',
      cache: 'no-cache',
      credentials: process.env.NODE_ENV === 'production' ? 'same-origin' : 'include',
      headers: new Headers({
        'Content-Type': 'application/json',
        'x-csrf': '1',
      }),
      body: JSON.stringify({
        url: window.location.href.replace('processes', ''),
      }),
    });

    const res = await response.json();
    return res;
  } catch (e) {
    throw e;
  }
}
