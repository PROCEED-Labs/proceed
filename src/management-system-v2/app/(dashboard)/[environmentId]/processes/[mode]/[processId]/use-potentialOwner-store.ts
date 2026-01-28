import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useEffect } from 'react';
import { fetchPotentialOwner } from './potentialOwner-server-action';
import { useEnvironment } from '@/components/auth-can';
import { isUserErrorResponse } from '@/lib/server-error-handling/user-error';

export type UserType = {
  [key: string]: {
    userName?: string;
    name: string;
  };
};

export type RoleType = Record<string, string>;

type PotentailOwnerStore = {
  user: UserType;
  roles: RoleType;

  setUser: (user: UserType) => void;
  setRoles: (roles: RoleType) => void;
};

const usePotentialOwnerStore = create<PotentailOwnerStore>()(
  immer((set) => ({
    user: {},
    roles: {},
    setUser: (user) =>
      set((state) => {
        state.user = user;
      }),
    setRoles: (roles) =>
      set((state) => {
        state.roles = roles;
      }),
  })),
);

/**
 * Hook to initialise the potential owner store with user and role data for a given environment.
 *
 * @param environmentId - The ID of the environment for which to fetch potential owner data.
 *
 * @example
 * ```typescript
 * useInitialisePotentialOwnerStore(environment.spaceId);
 * ```
 */
export const useInitialisePotentialOwnerStore = () => {
  const environment = useEnvironment();
  useEffect(() => {
    const initialiseStore = async () => {
      const response = await fetchPotentialOwner(environment.spaceId);
      if (isUserErrorResponse(response)) return;

      const { user, roles } = response;
      const store = usePotentialOwnerStore.getState();
      store.setUser(user);
      store.setRoles(roles);
    };

    if (environment.spaceId) initialiseStore();
  }, [environment.spaceId, environment.isOrganization]);
};

export default usePotentialOwnerStore;
