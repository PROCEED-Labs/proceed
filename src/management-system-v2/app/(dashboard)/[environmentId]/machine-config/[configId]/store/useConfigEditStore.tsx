import { create } from 'zustand';

interface ConfigEditStore {
  isEditModalOpen: boolean;
  openEditModal: () => void;
  closeEditModal: () => void;
}

export const useConfigEditStore = create<ConfigEditStore>((set) => ({
  isEditModalOpen: false,
  openEditModal: () => set({ isEditModalOpen: true }),
  closeEditModal: () => set({ isEditModalOpen: false }),
}));