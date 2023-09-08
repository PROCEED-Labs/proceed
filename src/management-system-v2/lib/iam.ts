'use client';

import { create } from 'zustand';
import Ability from 'proceed-management-system/src/backend/server/iam/authorization/abilityHelper';
import { PackedRulesForUser } from 'proceed-management-system/src/backend/server/iam/authorization/caslRules';
import { ResourceType } from 'proceed-management-system/src/backend/server/iam/authorization/permissionHelpers';

const BACKEND_URL = process.env.BACKEND_URL;

interface AuthResponse {
  isLoggedIn: boolean;
  config: {
    useAuthorization: boolean;
    allowRegistrations: boolean;
    useSessionManagement: boolean;
  };
  // NOTE user comes from auth0, thus the structure of it could change when changing providers
  user: {
    given_name: string;
    family_name: string;
    nickname: string;
    preferred_username: string;
    name: string;
    picture: string;
    updated_at: string;
    email: string;
    email_verified: boolean;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
    sub: string;
    sid: string;
    nonce: string;
  };
  handled: boolean;
  permissions: Partial<Record<ResourceType, { actions: number[]; conditions?: any }>>;
  csrfToken: string;
  userRules: PackedRulesForUser;
}

type AuthStoreType = (
  | {
      loggedIn: true;
    }
  | {
      loggedIn: false;
    }
) & {
  ability: Ability;
  oauthCallbackPerformed: boolean; // Needed so that Auth components don't do anything before we know if the user is logged in or not
  oauthCallback: (obj: AuthResponse | undefined) => void;
  logout: () => void;
} & Pick<AuthResponse, 'user' | 'csrfToken'>;

export const useAuthStore = create<AuthStoreType>((set) => ({
  oauthCallbackPerformed: false,
  loggedIn: false,
  logout() {
    set({ loggedIn: false });
  },
  user: {
    given_name: '',
    family_name: '',
    nickname: '',
    preferred_username: '',
    name: '',
    picture: '',
    updated_at: '',
    email: '',
    email_verified: false,
    iss: '',
    aud: '',
    iat: 0,
    exp: 0,
    sub: '',
    sid: '',
    nonce: '',
  },
  ability: new Ability([]),
  csrfToken: '',
  oauthCallback(obj: AuthResponse | undefined) {
    if (typeof obj === 'object' && obj.isLoggedIn) {
      set(
        {
          loggedIn: true,
          oauthCallbackPerformed: true,
          user: obj.user,
          csrfToken: obj.csrfToken,
          ability: new Ability(obj.userRules.rules),
        },
        true,
      );
    } else {
      set({ loggedIn: false, oauthCallbackPerformed: true });
    }
  },
}));

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
