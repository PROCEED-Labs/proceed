import { StoreApi, createStore, useStore } from 'zustand';
import { ReactNode, createContext, useContext, useRef } from 'react';
import { ProcessVariable } from '@/lib/process-variable-schema';

type Milestone = { id: string; name: string; description?: string };

type EditorStateStore = {
  isTextEditing: boolean;

  dragBlockers: string[];

  variables?: ProcessVariable[];
  milestones?: Milestone[];

  editingEnabled: boolean;

  setIsTextEditing: (editing: boolean) => void;
  blockDragging: (blockerId: string) => void;
  unblockDragging: (blockerId: string) => void;
  updateVariables: (newVariables: ProcessVariable[]) => void;
  updateMilestones: (newMilestones: Milestone[]) => void;
  setEditingEnabled: (enabled: boolean) => void;
};

const StoreContext = createContext<StoreApi<EditorStateStore> | null>(null);

export const EditorStoreProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<StoreApi<EditorStateStore> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createStore((set, get) => ({
      isTextEditing: false,

      dragBlockers: [],

      variables: undefined,
      milestones: undefined,

      editingEnabled: false,

      setIsTextEditing: (editing) => {
        set({ isTextEditing: editing });
      },

      blockDragging: (blockerId) => {
        set({ dragBlockers: [...get().dragBlockers, blockerId] });
      },

      unblockDragging: (blockerId) => {
        set({ dragBlockers: get().dragBlockers.filter((id) => id !== blockerId) });
      },

      updateVariables: (newVariables) => {
        set({ variables: newVariables });
      },

      updateMilestones: (newMilestones) => {
        set({ milestones: newMilestones });
      },

      setEditingEnabled: (enabled) => {
        set({ editingEnabled: enabled });
      },
    }));
  }

  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
};

function useEditorStateStore<T>(selector: (state: EditorStateStore) => T) {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('Missing Editor Store Provider!');
  }

  return useStore(store, selector);
}

export default useEditorStateStore;
