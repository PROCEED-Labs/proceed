import { updateSpaceSettings } from '@/lib/data/db/space-settings';

let timer: ReturnType<typeof setTimeout>;
let changes: Record<string, any> = {};
let pendingResolvers: (() => void)[] = [];

export const debouncedSettingsUpdate = (spaceId: string, key: string, value: any): Promise<void> => {
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
        resolvers.forEach(resolver => resolver());
      } catch (error) {
        // In case of error, still resolve to prevent hanging
        const resolvers = [...pendingResolvers];
        pendingResolvers = [];
        resolvers.forEach(resolver => resolver());
        throw error;
      }
    }, 300);
  });
};
