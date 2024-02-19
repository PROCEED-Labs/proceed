import React, { useEffect } from 'react';
import { create } from 'zustand';

type EnterStoreEntry = {
  target: React.MutableRefObject<any>;
  title: React.ReactNode;
  description: React.ReactNode;
  placement:
    | 'center'
    | 'left'
    | 'leftTop'
    | 'leftBottom'
    | 'right'
    | 'rightTop'
    | 'rightBottom'
    | 'top'
    | 'topLeft'
    | 'topRight'
    | 'bottom'
    | 'bottomLeft'
    | 'bottomRight';
};

export type RefStoreEntry = {
  target: () => (() => HTMLElement) | (() => null);
  title: React.ReactNode;
  description: React.ReactNode;
  placement:
    | 'center'
    | 'left'
    | 'leftTop'
    | 'leftBottom'
    | 'right'
    | 'rightTop'
    | 'rightBottom'
    | 'top'
    | 'topLeft'
    | 'topRight'
    | 'bottom'
    | 'bottomLeft'
    | 'bottomRight';
};

export type Tours = Record<string, RefStoreEntry[]>;

type RefStoreType = {
  tourIds: string[];
  tours: Tours;
  addRef: (tour: string, ref: EnterStoreEntry) => void;
  removeRef: (tour: string, ref: EnterStoreEntry) => void;
};

const wrapRef = (ref: EnterStoreEntry): RefStoreEntry => {
  return {
    ...ref,
    target: () => ref.target.current,
  };
};

export const useTourRefStore = create<RefStoreType>((set) => ({
  tourIds: [],
  tours: {},
  addRef(tour: string, ref: EnterStoreEntry) {
    set((state) => {
      /* Add new Tour */
      if (!state.tours[tour]) {
        return {
          tourIds: [...state.tourIds, tour],
          tours: {
            ...state.tours,
            [tour]: [wrapRef(ref)],
          },
        };
      }
      /* Update existing Tour */
      if (
        !state.tours[tour].some(
          (entry) => entry.title === ref.title && entry.description === ref.description,
        )
      ) {
        return {
          tours: {
            ...state.tours,
            [tour]: [
              ...state.tours[tour].filter((entry) => {
                return entry.title !== ref.title && entry.description !== ref.description;
              }),
              wrapRef(ref),
            ],
          },
        };
      }
      return state;
    });
  },
  removeRef(tour: string, ref: EnterStoreEntry) {
    set((state) => {
      const newState = {
        tourIds: state.tourIds,
        tours: {
          ...state.tours,
          [tour]: state.tours[tour]?.filter(
            (entry) => !(entry.title === ref.title && entry.description === ref.description),
          ),
        },
      };
      /* Remove Tour if empty */
      if (newState.tours[tour].length === 0) {
        delete newState.tours[tour];
        newState.tourIds = state.tourIds.filter((id) => id !== tour);
      }
      return newState;
    });
  },
}));

export const useTour = (tourname: string, entries: EnterStoreEntry[]) => {
  const { addRef, removeRef } = useTourRefStore((state) => state);

  useEffect(() => {
    entries.forEach((entry) => {
      addRef(tourname, entry);
    });

    return () => {
      entries.forEach((entry) => {
        removeRef(tourname, entry);
      });
    };
  }, []);
};

type FilteredTourEntry = EnterStoreEntry & {
  viewable: boolean;
};

export const useFilteredTour = (tourname: string, entries: FilteredTourEntry[]) => {
  const filteredEntries = entries
    .filter((entry) => entry.viewable)
    .map((entry) => ({
      target: entry.target,
      title: entry.title,
      description: entry.description,
      placement: entry.placement,
    }));

  const { addRef, removeRef } = useTourRefStore((state) => state);

  useEffect(() => {
    filteredEntries.forEach((entry) => {
      addRef(tourname, entry);
    });

    return () => {
      filteredEntries.forEach((entry) => {
        removeRef(tourname, entry);
      });
    };
  }, []);
};
