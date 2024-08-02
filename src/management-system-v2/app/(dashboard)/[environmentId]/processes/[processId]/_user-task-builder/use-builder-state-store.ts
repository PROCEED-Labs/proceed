import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type BuilderStateStore = {
  isTextEditing: boolean;

  setIsTextEditing: (editing: boolean) => void;
};

const useBuilderStateStore = create<BuilderStateStore>()(
  immer((set) => ({
    iframe: null,
    isTextEditing: false,

    setIsTextEditing: (editing) => {
      set({ isTextEditing: editing });
    },
  })),
);

export default useBuilderStateStore;
