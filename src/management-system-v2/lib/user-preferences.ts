import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';

type PreferencesType = Record<string, string | number | boolean>;

type PreferencesStoreType = {
  preferences: PreferencesType;
  addPreferences: (changes: PreferencesType) => void;
};

const defaultPreferences: PreferencesType = {
  /* Default User-Settings: */
  'show-process-meta-data': true,
  'icon-view-in-process-list': false,
};

export const useUserPreferencesStore = create<PreferencesStoreType>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,

      addPreferences: (changes: PreferencesType) => {
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

  if (data) return { preferences: data, addPreferences: addPrefs };

  return {
    preferences: defaultPreferences,
    addPreferences: addPrefs,
  };
};
