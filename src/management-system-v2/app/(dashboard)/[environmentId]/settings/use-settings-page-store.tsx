import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { SettingGroup, Settings } from './type-util';

type SettingsPageStore = {
  settings: Settings;

  registerGroup: (groupKey: string, group: SettingGroup) => void;
};

const useSettingsPageStore = create<SettingsPageStore>()(
  immer((set, get) => ({
    settings: {},

    registerGroup: (groupKey, group) => {
      set({ settings: { ...get().settings, [groupKey]: group } });
    },
  })),
);

export default useSettingsPageStore;
