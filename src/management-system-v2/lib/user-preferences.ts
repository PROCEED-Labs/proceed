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

type PreferencesType = Record<string, any> & {
  // other properties
  'columns-in-table-view-process-list': { name: string; width: string | number }[];
} & GetType<typeof defaultPreferences>;

type PreferencesStoreType = {
  preferences: PreferencesType;
  addPreferences: (changes: Partial<RemoveReadOnly<PreferencesType>>) => void;
  _hydrated: boolean;
};

const defaultPreferences = {
  /* Default User-Settings: */
  /* All elements in any array need to have the same type / shape */
  'icon-view-in-process-list': false,
  'icon-view-in-user-list': false,
  'icon-view-in-role-list': false,
  'columns-in-table-view-process-list': [
    { name: 'Favorites', width: 40 },
    { name: 'Name', width: 'auto' },
    { name: 'Description', width: 'auto' },
    { name: 'Last Edited', width: 'auto' },
    // { name: 'Created On', width: 'auto' },
    // { name: 'File Size', width: 'auto' },
    // { name: 'Owner', width: 'auto' },
  ],
  'role-page-side-panel': { open: false, width: 300 },
  'user-page-side-panel': { open: false, width: 300 },
  'process-meta-data': { open: false, width: 300 },
  'environments-page-side-panel': { open: false, width: 300 },
  'tech-data-open-tree-items': [] as { id: string; open: string[] }[],
  'tech-data-editor': { siderOpen: true, siderWidth: 300 },
}; /* as const */ /* Does not work for strings */

const partialUpdate = (
  defaultPreferences: PreferencesType,
  currentPreferences: PreferencesType,
): PreferencesType => {
  const updateArray = (defaultArray: any[], currentArray: any[]): any[] => {
    /* In case default array is empty */
    if (defaultArray.length === 0) return currentArray;

    /* Shape-Switch */
    let shapeIsDifferent = false;

    /* just take first element of array, since only the inner shape and not the values are interesting */
    const defaultValueSample =
      defaultArray[0]; /* NOTE: Assumes that every default array has at least one entry! (Check above) */

    const updatedArray = currentArray.map((currentValue) => {
      /* For speed up (cannot break map)*/
      if (shapeIsDifferent) return currentValue;

      /* Default elment is an array */
      if (Array.isArray(defaultValueSample)) {
        /* Currently saved is not an array */
        if (!Array.isArray(currentValue)) {
          shapeIsDifferent = true;
          return defaultValueSample;
          /* Currently saved is an array */
        } else {
          return updateArray(defaultValueSample, currentValue);
        }
        /* Default elment is an an object */
      } else if (typeof defaultValueSample === 'object' && defaultValueSample !== null) {
        /* Currently saved is not an object */
        if (
          typeof currentValue !== 'object' ||
          currentValue === null ||
          Array.isArray(currentValue)
        ) {
          shapeIsDifferent = true;
          return defaultValueSample;
          /* Currently saved is an object */
        } else {
          return updateObject(defaultValueSample, currentValue);
        }
        /* Everything else */
      } else {
        return currentValue;
      }
    });

    return shapeIsDifferent ? defaultArray : updatedArray;
  };

  const updateObject = (
    defaultObject: Record<string, any>,
    currentObject: Record<string, any>,
    root: boolean = false,
  ): Record<string, any> => {
    let updatedObject: Record<string, any> = {};
    /* Shape-Switch */
    let shapeIsDifferent = false;

    /* Add all entries from default (implicitly removes entries not present in default) */
    for (const key in defaultObject) {
      /* Not present yet */
      if (!currentObject.hasOwnProperty(key)) {
        /* For nested objects -> replace them with default as something has changed */
        if (!root) {
          shapeIsDifferent = true;
          break;
        }
        /* For the root object -> add them as a new user-preference was added */
        updatedObject[key] = defaultObject[key];
      } else {
        const defaultValue = defaultObject[key];
        const currentValue = currentObject[key];
        /* Array */
        if (Array.isArray(defaultValue)) {
          /* Currently saved is not an array */
          if (!Array.isArray(currentValue)) {
            updatedObject[key] = defaultValue;
            /* Currently saved is an array */
          } else {
            updatedObject[key] = updateArray(defaultValue, currentValue);
          }
          /* Object */
        } else if (typeof defaultValue === 'object' && defaultValue !== null) {
          /* Currently saved is not an object */
          if (
            typeof currentValue !== 'object' ||
            currentValue === null ||
            Array.isArray(currentValue)
          ) {
            updatedObject[key] = defaultValue;
            /* Currently saved is an object */
          } else {
            updatedObject[key] = updateObject(defaultValue, currentValue);
          }
          /* Everything else */
        } else {
          updatedObject[key] = currentValue;
        }
      }
    }

    return shapeIsDifferent ? defaultObject : updatedObject;
  };

  return updateObject(defaultPreferences, currentPreferences, true) as PreferencesType;
};

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
    useUserPreferencesStore.setState((state) => {
      return {
        preferences: {
          ...partialUpdate(defaultPreferences, state.preferences),
        },
        _hydrated: true,
      };
    });
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

/**
 * Custom hook for managing device dependant user preferences in components.
 * The default values for the preferences should be defined in the 'user-preferences.ts' file.
 * The store is initialised with these defaults, and it persists changes in the local storage.
 *
 *
 * @example
 * // Accessing a specific preference value
 * const MyComponent = () => {
 *   const iconViewInProcessList = useUserPreferences.use['icon-view-in-process-list']();
 *   return <div>{iconViewInProcessList ? 'Icon view is enabled' : 'Icon view is disabled'}</div>;
 * };
 *
 * @example
 * // Updating preferences
 * const MyComponent = () => {
 *   const addPreferences = useUserPreferences.use.addPreferences();
 *   const handleClick = () => {
 *     addPreferences({ 'icon-view-in-process-list': true });
 *   };
 *   return <button onClick={handleClick}>Enable Icon View</button>;
 * };
 *
 * @example
 * // Using preferences in a custom hook
 * export const useColumnWidth = (
 *   preferenceKey: string,
 *   someOtherProp: NonNullable<TableProps['columns']>,
 * ) => {
 *   const columnsInPreferences = useUserPreferences.use[preferenceKey]();
 *   const addPreferences = useUserPreferences.use.addPreferences();
 *   // ...
 * };
 *
 * @example
 * // Using the store directly
 * const { preferences, addPreferences } = useUserPreferences();
 * // ...
 */
export const useUserPreferences = _useUserPreferences as UseStore;
