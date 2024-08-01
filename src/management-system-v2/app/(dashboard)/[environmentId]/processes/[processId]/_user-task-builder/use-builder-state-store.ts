import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type BuilderStateStore = {
  iframe: HTMLIFrameElement | null;
  isTextEditing: boolean;

  setIframe: (newRef: HTMLIFrameElement | null) => void;
  setIsTextEditing: (editing: boolean) => void;
};

const useBuilderStateStore = create<BuilderStateStore>()(
  immer((set) => ({
    iframe: null,
    isTextEditing: false,

    setIframe: (element) => {
      set({ iframe: element });
    },
    setIsTextEditing: (editing) => {
      set({ isTextEditing: editing });
    },
  })),
);

export default useBuilderStateStore;
