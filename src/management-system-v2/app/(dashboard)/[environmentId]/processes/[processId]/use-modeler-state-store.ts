import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Root } from 'bpmn-js/lib/model/Types';

type ModelerStateStore = {
  modeler: BPMNCanvasRef | null;
  selectedElementId: null | string;
  /** An arbitrary state variable to enable child components to react to
   * onChange when they can't set the callback themselves.
   *
   * This is needed since some child components of the modeler need to update on
   * onChange. Because the state change to the BPMN objects is internal to
   * BPMN-JS and not exposed to React for performance reasons, we can't pass any
   * updated BPMN to the child components. Therefore we need _something_ to
   * change to signal a rerender. */
  changeCounter: number;
  rootElement: Root | null;
  setModeler: (newModeler: BPMNCanvasRef | null) => void;
  setSelectedElementId: (newId: null | string) => void;
  setRootElement: (newRoot: Root | null) => void;
  incrementChangeCounter: () => void;
};

const useModelerStateStore = create<ModelerStateStore>()(
  immer((set) => ({
    modeler: null,
    selectedElementId: null,
    changeCounter: 0,
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
    incrementChangeCounter: () =>
      set((state) => {
        state.changeCounter += 1;
      }),
  })),
);

export default useModelerStateStore;
