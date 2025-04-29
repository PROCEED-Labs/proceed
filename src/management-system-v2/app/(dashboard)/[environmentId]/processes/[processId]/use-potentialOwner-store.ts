import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useEffect } from 'react';
import { fetchPotentialOwner } from './potentialOwner-server-action';

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
 * const environment = useEnvironment();
 * useInitialisePotentialOwnerStore(environment.spaceId);
 * ```
 */
export const useInitialisePotentialOwnerStore = (environmentId: string) => {
  useEffect(() => {
    const initialiseStore = async () => {
      const { user, roles } = await fetchPotentialOwner(environmentId);
      const store = usePotentialOwnerStore.getState();
      store.setUser(user);
      store.setRoles(roles);
    };

    initialiseStore();
  }, [environmentId]);
};

export default usePotentialOwnerStore;
