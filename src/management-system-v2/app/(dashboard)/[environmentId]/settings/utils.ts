import { updateSpaceSettings } from '@/lib/data/space-settings';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

let timer: ReturnType<typeof setTimeout>;
let changes: Record<string, any> = {};
export function useDebouncedSettingsUpdate() {
  const { message } = App.useApp();
  const router = useRouter();

  const debouncedUpdate = useCallback((spaceId: string, key: string, value: any) => {
    clearTimeout(timer);
    changes[key] = value;

    timer = setTimeout(() => {
      updateSpaceSettings(spaceId, changes);
      changes = {};
      message.success('Settings updated');
      router.refresh();
    }, 1000);
  }, []);

  return debouncedUpdate;
}
