import { create } from 'zustand';
import { ProcessExportOptions } from './process-export/export-preparation';

type ExportTypeStore = {
  preselectedExportType: ProcessExportOptions['type'] | undefined;
  setPreselectedExportType: (exportType: ProcessExportOptions['type']) => void;
  resetPreselectedExportType: () => void;
};

const useExportTypeStore = create<ExportTypeStore>((set) => ({
  preselectedExportType: undefined,

  setPreselectedExportType: (exportType) => set({ preselectedExportType: exportType }),

  resetPreselectedExportType: () => {
    set({ preselectedExportType: undefined });
  },
}));

export default useExportTypeStore;
