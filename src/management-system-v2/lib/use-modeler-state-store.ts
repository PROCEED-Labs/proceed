import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type Modeler from 'bpmn-js/lib/Modeler';
import type Viewer from 'bpmn-js/lib/NavigatedViewer';

type ModelerStateStore = {
  modeler: Modeler | Viewer | null;
  selectedVersion: number;
  selectedElementId: null | string;
  setModeler: (newModeler: Modeler | Viewer | null) => void;
  setSelectedVersion: (newVersion: number) => void;
  setSelectedElementId: (newId: null | string) => void;
};

const useModelerStateStore = create<ModelerStateStore>()(
  immer((set) => ({
    modeler: null,
    selectedVersion: -1,
    selectedElementId: null,
    setModeler: (newModeler: Modeler | Viewer | null) =>
      set((state) => {
        state.modeler = newModeler;
      }),
    setSelectedVersion: (newVersion: number) =>
      set((state) => {
        state.selectedVersion = newVersion;
      }),
    setSelectedElementId: (newId: null | string) =>
      set((state) => {
        state.selectedElementId = newId;
      }),
  }))
);

export default useModelerStateStore;
