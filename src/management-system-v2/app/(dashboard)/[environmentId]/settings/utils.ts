import { updateSpaceSettings } from '@/lib/data/db/space-settings';

let timer: ReturnType<typeof setTimeout>;
let changes: Record<string, any> = {};
export const debouncedSettingsUpdate = (spaceId: string, key: string, value: any) => {
  clearTimeout(timer);
  changes[key] = value;
  timer = setTimeout(() => {
    updateSpaceSettings(spaceId, changes);
    changes = {};
  }, 1000);
};
