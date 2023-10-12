import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type PreferencesType = {
  preferences: Record<string, string | number | boolean>;
};

type PreferencesStoreType = PreferencesType & {
  addPreference: (changes: PreferencesType) => void;
};

export const useUserPreferences = create(
  persist(
    (set, get) => ({
      preferences: {
        'show-process-meta-data': true,
        'icon-view-in-process-list': false,
      },
      //   addPreferences: (changes: PreferencesType) =>
      //     set({ preferences: { ...get().preferences, ...changes } }),
      addPreferences: (changes: PreferencesType) => {
        console.log('changes', changes);
        return set({ preferences: { ...get().preferences, ...changes } });
      },
    }),
    {
      name: 'user-preferences', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // alternatively: use `sessionStorage` or custom abstraction
    },
  ),
);
