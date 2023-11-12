'use client';

import { create } from 'zustand';

type CsrfTokenStore = {
  csrfToken: string;
  setCsrfToken: (csrfToken: string) => void;
};

export const useCsrfTokenStore = create<CsrfTokenStore>((set) => ({
  csrfToken: 'hola',
  setCsrfToken: (csrfToken) => set({ csrfToken }),
}));
