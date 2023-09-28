import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { ApiData } from './fetch-data';
import type Modeler from 'bpmn-js/lib/Modeler';
import type Viewer from 'bpmn-js/lib/NavigatedViewer';

type id = { version: string | number; name: string; description: string };

type ModelerStateStore = {
  modeler: Modeler | Viewer | null;
  selectedProcess: ApiData<'/process', 'get'>[number] | undefined;
  selectedVersion: number | string | null;
  selectedElementId: null | string;
  editingDisabled: boolean;
  versions: id[];
  setModeler: (newModeler: Modeler | Viewer | null) => void;
  setSelectedProcess: (process: ApiData<'/process', 'get'>[number] | undefined) => void;
  setSelectedVersion: (newVersion: number | string | null) => void;
  setSelectedElementId: (newId: null | string) => void;
  setVersions: (newVersions: id[]) => void;
};

const useModelerStateStore = create<ModelerStateStore>()(
  immer((set) => ({
    modeler: null,
    selectedProcess: undefined,
    selectedVersion: null,
    selectedElementId: null,
    editingDisabled: false,
    versions: [],
    setModeler: (newModeler: Modeler | Viewer | null) =>
      set((state) => {
        state.modeler = newModeler;
      }),
    setSelectedProcess: (process: ApiData<'/process', 'get'>[number] | undefined) =>
      set((state) => {
        state.selectedProcess = process;
      }),
    setSelectedVersion: (newVersion: number | string | null) =>
      set((state) => {
        state.selectedVersion = newVersion;
        state.editingDisabled = newVersion !== null;
      }),
    setSelectedElementId: (newId: null | string) =>
      set((state) => {
        state.selectedElementId = newId;
      }),
    setVersions: (newVersions: id[]) =>
      set((state) => {
        state.versions = newVersions;
      }),
  })),
);

export default useModelerStateStore;
