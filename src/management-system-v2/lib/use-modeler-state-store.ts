import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type Modeler from 'bpmn-js/lib/Modeler';
import type Viewer from 'bpmn-js/lib/NavigatedViewer';

type ModelerStateStore = {
  modeler: Modeler | Viewer | null;
  selectedElementId: null | string;
  editingDisabled: boolean;
  setModeler: (newModeler: Modeler | Viewer | null) => void;
  setSelectedElementId: (newId: null | string) => void;
};

const useModelerStateStore = create<ModelerStateStore>()(
  immer((set) => ({
    modeler: null,
    selectedElementId: null,
    editingDisabled: false,
    setModeler: (newModeler: Modeler | Viewer | null) =>
      set((state) => {
        state.modeler = newModeler;
      }),
    setSelectedElementId: (newId: null | string) =>
      set((state) => {
        state.selectedElementId = newId;
      }),
  })),
);

export default useModelerStateStore;
