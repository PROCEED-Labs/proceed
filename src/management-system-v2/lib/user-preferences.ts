import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import { RemoveReadOnly, ToPrimitive } from './typescript-utils';

type GetType<T> = T extends Record<any, any>
  ? T extends readonly any[]
    ? readonly (T[0] extends undefined ? any : ToPrimitive<T[0]>)[]
    : {
        [Key in keyof T]: GetType<T[Key]>;
      }
  : ToPrimitive<T>;

type PreferencesType = Record<string, any> & GetType<typeof defaultPreferences>;

type PreferencesStoreType = {
  preferences: PreferencesType;
  addPreferences: (changes: Partial<RemoveReadOnly<PreferencesType>>) => void;
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
  'role-page-side-panel': { open: false, width: 300 },
  'user-page-side-panel': { open: false, width: 300 },
} as const;

const useUserPreferencesStore = create<PreferencesStoreType>()(
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

const defaultStore: PreferencesStoreType = {
  preferences: defaultPreferences,
  addPreferences: () => {},
};

type AllProperties = PreferencesType & {
  addPreferences: PreferencesStoreType['addPreferences'];
};
type AutoGenerators = {
  [K in keyof AllProperties]: () => AllProperties[K];
};
type UseStore = {
  (): PreferencesStoreType;
  <U>(selector: (state: PreferencesStoreType) => U): U;
  getState: (typeof useUserPreferencesStore)['getState'];
  setState: (typeof useUserPreferencesStore)['setState'];
  use: AutoGenerators;
};

const _useUserPreferences = (selector?: (state: PreferencesStoreType) => any) => {
  //@ts-ignore
  const storeValues = useUserPreferencesStore(selector);
  const defaultValues = selector ? selector(defaultStore) : defaultStore;

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, [hydrated]);

  return hydrated ? storeValues : defaultValues;
};

_useUserPreferences.getState = useUserPreferencesStore.getState;
_useUserPreferences.setState = useUserPreferencesStore.getState;
_useUserPreferences.use = {} as AutoGenerators;

_useUserPreferences.use.addPreferences = () => _useUserPreferences((store) => store.addPreferences);
for (const preference of Object.keys(defaultPreferences)) {
  _useUserPreferences.use[preference] = () =>
    _useUserPreferences((store) => store.preferences[preference]);
}

export const useUserPreferences = _useUserPreferences as UseStore;
