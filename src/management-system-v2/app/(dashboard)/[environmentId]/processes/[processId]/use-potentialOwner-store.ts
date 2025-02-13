import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

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

export default usePotentialOwnerStore;
