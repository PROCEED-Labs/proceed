'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { create } from 'zustand';

type CsrfTokenStore = {
  csrfToken: string;
  setCsrfToken: (csrfToken: string) => void;
};

/* Even though the csrf token is accessible  through useSession,
 * functions outside of react need to be able to access it*/
export const SetCsrfToken = () => {
  const session = useSession();

  useEffect(() => {
    if (session.status === 'authenticated') {
      useCsrfTokenStore.getState().setCsrfToken(session.data.csrfToken);
    }
  }, [session]);

  return null;
};

export const useCsrfTokenStore = create<CsrfTokenStore>((set) => ({
  csrfToken: '',
  setCsrfToken: (csrfToken) => set({ csrfToken }),
}));
