import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type LastClickedStore = {
  processId: string | undefined;
  setProcessId: (newProcessId: string | undefined) => void;
};

const useLastClickedStore = create<LastClickedStore>()(
  immer((set) => ({
    processId: undefined,
    setProcessId: (newId) =>
      set((state) => {
        state.processId = newId;
      }),
  })),
);

export default useLastClickedStore;
