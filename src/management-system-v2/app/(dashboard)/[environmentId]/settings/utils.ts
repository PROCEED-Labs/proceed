import { updateSpaceSettings } from '@/lib/data/space-settings';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

let timer: ReturnType<typeof setTimeout>;
let changes: Record<string, any> = {};
let pendingResolvers: (() => void)[] = [];

export const debouncedSettingsUpdate = (
  spaceId: string,
  key: string,
  value: any,
): Promise<void> => {
  return new Promise((resolve) => {
    clearTimeout(timer);
    changes[key] = value;
    pendingResolvers.push(resolve);

    timer = setTimeout(async () => {
      try {
        await updateSpaceSettings(spaceId, changes);
        changes = {};

        // Resolve all pending promises
        const resolvers = [...pendingResolvers];
        pendingResolvers = [];
        resolvers.forEach((resolver) => resolver());
      } catch (error) {
        // In case of error, still resolve to prevent hanging
        const resolvers = [...pendingResolvers];
        pendingResolvers = [];
        resolvers.forEach((resolver) => resolver());
        throw error;
      }
    }, 300);
  });
};

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
