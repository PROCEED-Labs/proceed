import { useEffect } from 'react';
import { updateUser } from './data/users';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type FavouritesStore = {
  favourites: string[];
  initialise: (ids: string[]) => void;
  updateFavouriteProcesses: (id: string | string[]) => void;
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
      let newId: string[] = [];
      if (!Array.isArray(id)) newId = [id];

      const oldFavourites = get().favourites;
      let newFavourites: string[] = [];

      newId.forEach((id) => {
        if (oldFavourites.includes(id)) {
          newFavourites = oldFavourites.filter((fav) => fav !== id);
        } else {
          newFavourites = [...oldFavourites, id];
        }
      });

      updateUser({ favourites: newFavourites }).then(() => {
        set((state) => {
          state.favourites = newFavourites;
        });
      });
    },
  })),
);

export const initialiseFavourites = (ids: string[]) => {
  const { initialise } = useFavouritesStore();

  useEffect(() => {
    initialise(ids);
  }, []);
};

export default useFavouritesStore;
