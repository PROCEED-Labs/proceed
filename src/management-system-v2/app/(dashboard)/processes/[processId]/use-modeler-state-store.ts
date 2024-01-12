import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Root } from 'bpmn-js/lib/model/Types';

type ModelerStateStore = {
  modeler: BPMNCanvasRef | null;
  selectedElementId: null | string;
  rootElement: Root | null;
  setModeler: (newModeler: BPMNCanvasRef | null) => void;
  setSelectedElementId: (newId: null | string) => void;
  setRootElement: (newRoot: Root | null) => void;
};

const useModelerStateStore = create<ModelerStateStore>()(
  immer((set) => ({
    modeler: null,
    selectedElementId: null,
    rootElement: null,
    setModeler: (newModeler) =>
      set((state) => {
        state.modeler = newModeler;
      }),
    setSelectedElementId: (newId) =>
      set((state) => {
        state.selectedElementId = newId;
      }),
    setRootElement: (newRoot) =>
      set((state) => {
        state.rootElement = newRoot;
      }),
  })),
);

export default useModelerStateStore;
