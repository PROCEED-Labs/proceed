import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type BuilderStateStore = {
  isTextEditing: boolean;

  dragBlockers: string[];

  setIsTextEditing: (editing: boolean) => void;
  blockDragging: (blockerId: string) => void;
  unblockDragging: (blockerId: string) => void;
};

const useBuilderStateStore = create<BuilderStateStore>()(
  immer((set, get) => ({
    isTextEditing: false,

    dragBlockers: [],

    setIsTextEditing: (editing) => {
      set({ isTextEditing: editing });
    },

    blockDragging: (blockerId) => {
      set({ dragBlockers: [...get().dragBlockers, blockerId] });
    },

    unblockDragging: (blockerId) => {
      set({ dragBlockers: get().dragBlockers.filter((id) => id !== blockerId) });
    },
  })),
);

export default useBuilderStateStore;
