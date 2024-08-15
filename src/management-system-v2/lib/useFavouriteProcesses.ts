import { useEffect } from 'react';
import { updateUser } from './data/users';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { wrapServerCall } from './user-error';

type FavouritesStore = {
  favourites: string[];
  initialise: (ids: string[]) => void;
  updateFavouriteProcesses: (id: string | string[]) => void;
  removeIfPresent: (id: string | string[]) => void;
};

const useFavouritesStore = create<FavouritesStore>()(
  immer((set, get) => ({
    favourites: [],
    initialise: (ids) => {
      set((state) => {
        state.favourites = ids;
      });
    },
    updateFavouriteProcesses: (id) => {
      let newId: string[] = Array.isArray(id) ? id : [id];

      const oldFavourites = get().favourites;
      let newFavourites: string[] = [];

      newId.forEach((id) => {
        if (oldFavourites.includes(id)) {
          newFavourites = oldFavourites.filter((fav) => fav !== id);
        } else {
          newFavourites = [...oldFavourites, id];
        }
      });
      wrapServerCall({
        fn: () => updateUser({ favourites: newFavourites }),
        onSuccess: () =>
          set((state) => {
            state.favourites = newFavourites;
          }),
      });
    },
    removeIfPresent: (id) => {
      const ids = Array.isArray(id) ? id : [id];
      const oldFavourites = get().favourites;
      const newFavourites = oldFavourites.filter((fav) => !ids.includes(fav));
      updateUser({ favourites: newFavourites }).then(() => {
        set((state) => {
          state.favourites = newFavourites;
        });
      });
    },
  })),
);

export const useInitialiseFavourites = (ids: string[]) => {
  const { initialise } = useFavouritesStore();

  useEffect(() => {
    initialise(ids);
  }, []);
};

export default useFavouritesStore;
