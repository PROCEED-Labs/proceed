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
  zoomLevel: number;
  rootElement: Root | null;
  isFullScreen: boolean;
  setModeler: (newModeler: BPMNCanvasRef | null) => void;
  setSelectedElementId: (newId: null | string) => void;
  setZoomLevel: (newZoomLevel: number) => void;
  setRootElement: (newRoot: Root | null) => void;
  incrementChangeCounter: () => void;
  setFullScreen: (isFullScreen: boolean) => void;
};

const useModelerStateStore = create<ModelerStateStore>()(
  immer((set) => ({
    modeler: null,
    selectedElementId: null,
    changeCounter: 0,
    zoomLevel: 1,
    rootElement: null,
    isFullScreen: false,
    setModeler: (newModeler) =>
      set((state) => {
        state.modeler = newModeler;
      }),
    setSelectedElementId: (newId) =>
      set((state) => {
        state.selectedElementId = newId;
      }),
    setZoomLevel: (newZoomLevel) =>
      set((state) => {
        state.zoomLevel = newZoomLevel;
      }),
    setRootElement: (newRoot) =>
      set((state) => {
        state.rootElement = newRoot;
      }),
    incrementChangeCounter: () =>
      set((state) => {
        state.changeCounter += 1;
      }),
    setFullScreen: (isFullScreen) =>
      set((state) => {
        state.isFullScreen = isFullScreen;
      }),
  })),
);

export default useModelerStateStore;
