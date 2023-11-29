import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';

type PreferencesType = Record<string, any> & {
  -readonly [key in keyof typeof defaultPreferences]: any;
};

type PreferencesStoreType = {
  preferences: PreferencesType;
  addPreferences: (changes: Partial<PreferencesType>) => void;
};

const defaultPreferences = {
  /* Default User-Settings: */
  /*
    Delete user-preferences in localstorage, after adding a preference-setting
    The new default won't be set otherwise
  */
  'show-process-meta-data': true,
  'icon-view-in-process-list': false,
  'process-list-columns': ['', 'Process Name', 'Description', 'Last Edited'],
  'ask-before-deleting-multiple': true,
  'ask-before-deleting-single': true,
  'ask-before-copying': true,
  'process-copy-modal-accordion': true,
} as const;

export const useUserPreferencesStore = create<PreferencesStoreType>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,

      addPreferences: (changes) => {
        set({ preferences: { ...get().preferences, ...changes } });
      },
    }),
    {
      name: 'user-preferences', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // alternatively: use `sessionStorage` or custom abstraction
    },
  ),
);

export const useUserPreferences = () => {
  const prefs = useUserPreferencesStore((state) => state.preferences);
  const addPrefs = useUserPreferencesStore((state) => state.addPreferences);
  const [data, setData] = useState<PreferencesType | undefined>(undefined);

  useEffect(() => {
    setData(prefs);
  }, [prefs]);

  return {
    preferences: (data ? data : defaultPreferences) as PreferencesType,
    addPreferences: addPrefs,
  };
};
