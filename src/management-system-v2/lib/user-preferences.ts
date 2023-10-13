import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import { immer } from 'zustand/middleware/immer';

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
        set({ preferences: { ...get().preferences, ...changes } });
      },
    }),
    {
      name: 'user-preferences', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // alternatively: use `sessionStorage` or custom abstraction
    },
  ),
);

const addPreferences = (changes: PreferencesType) => {};

const usePreferences = () => {
  const result = useUserPreferences((state) => state.preferences);
  const [data, setData] = useState<PreferencesType | undefined>(undefined);

  useEffect(() => {
    setData(result);
  }, [result]);

  return (
    data ?? {
      /* Default User-Settings: */
      'show-process-meta-data': true,
      'icon-view-in-process-list': false,
    }
  );
};

const func = { preferences: usePreferences, addPreferences: addPreferences };

export default func;
