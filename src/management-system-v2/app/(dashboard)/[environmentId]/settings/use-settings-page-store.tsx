import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { SettingGroup, Settings } from './type-util';

type SettingsPageStore = {
  settings: Settings;
  priorities: Record<string, number>;

  registerSection: (sectionName: string, section: SettingGroup) => void;
  setPriority: (sectionName: string, priority: number) => void;
};

const useSettingsPageStore = create<SettingsPageStore>()(
  immer((set, get) => ({
    settings: {},
    priorities: {},

    registerSection: (sectionName, section) => {
      set({ settings: { ...get().settings, [sectionName]: section } });
    },
    setPriority: (sectionName, priority) => {
      set({ priorities: { ...get().priorities, [sectionName]: priority } });
    },
  })),
);

export default useSettingsPageStore;
