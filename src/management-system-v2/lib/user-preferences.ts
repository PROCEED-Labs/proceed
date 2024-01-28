import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import { RemoveReadOnly, ToPrimitive } from './typescript-utils';

type GetType<T> =
  T extends Record<any, any>
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
  _hydrated: boolean;
};

const defaultPreferences = {
  /* Default User-Settings: */
  /*
    Delete user-preferences in localstorage, after adding a preference-setting
    The new default won't be set otherwise
  */
  'icon-view-in-process-list': false,
  'process-list-columns': ['', 'Process Name', 'Description', 'Last Edited'],
  'role-page-side-panel': { open: false, width: 300 },
  'user-page-side-panel': { open: false, width: 300 },
  'process-meta-data': { open: false, width: 300 },
} as const;

const useUserPreferencesStore = create<PreferencesStoreType>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      addPreferences: (changes) => {
        set({ preferences: { ...get().preferences, ...changes } });
      },
      _hydrated: false,
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
  _hydrated: false,
};

type AllProperties = PreferencesType & {
  addPreferences: PreferencesStoreType['addPreferences'];
  _hydrated: PreferencesStoreType['_hydrated'];
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
    useUserPreferencesStore.setState({ _hydrated: true });
  }, [hydrated]);

  return hydrated ? storeValues : defaultValues;
};

_useUserPreferences.getState = useUserPreferencesStore.getState;
_useUserPreferences.setState = useUserPreferencesStore.getState;
_useUserPreferences.use = {} as AutoGenerators;

_useUserPreferences.use.addPreferences = () => _useUserPreferences((store) => store.addPreferences);
_useUserPreferences.use._hydrated = () => _useUserPreferences((store) => store._hydrated);
for (const preference of Object.keys(defaultPreferences)) {
  _useUserPreferences.use[preference] = () =>
    _useUserPreferences((store) => store.preferences[preference]);
}

export const useUserPreferences = _useUserPreferences as UseStore;
