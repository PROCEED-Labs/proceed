import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { BPMNCanvasRef } from '@/components/bpmn-canvas';

type ModelerStateStore = {
  modeler: BPMNCanvasRef | null;
  selectedElementId: null | string;
  setModeler: (newModeler: BPMNCanvasRef | null) => void;
  setSelectedElementId: (newId: null | string) => void;
};

const useModelerStateStore = create<ModelerStateStore>()(
  immer((set) => ({
    modeler: null,
    selectedElementId: null,
    setModeler: (newModeler) =>
      set((state) => {
        state.modeler = newModeler;
      }),
    setSelectedElementId: (newId) =>
      set((state) => {
        state.selectedElementId = newId;
      }),
  })),
);

export default useModelerStateStore;
