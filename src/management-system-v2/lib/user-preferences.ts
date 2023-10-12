import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type PreferencesType = Record<string, string | number | boolean>;

type PreferencesStoreType = {
  preferences: PreferencesType;
  addPreferences: (changes: PreferencesType) => void;
};

export const useUserPreferences = create<PreferencesStoreType>()(
  persist(
    (set, get) => ({
      preferences: {
        /* Default User-Settings: */
        'show-process-meta-data': true,
        'icon-view-in-process-list': false,
      },

      addPreferences: (changes: PreferencesType) => {
        set((state) => ({ preferences: { ...state.preferences, ...changes } }));
      },
    }),
    {
      name: 'user-preferences', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // alternatively: use `sessionStorage` or custom abstraction
    },
  ),
);

// addPreferences: (changes: PreferencesType) => {
//   const oldPrefs = get().preferences;
//   return set({ preferences: { ...oldPrefs, ...changes } });
// },
