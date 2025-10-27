'use client';

import { createContext, useContext } from 'react';

type ProcessViewContextType = {
  isListView: boolean;
  processContextPath: string;
};

const ProcessViewContext = createContext<ProcessViewContextType | undefined>(undefined);

export function useProcessView() {
  const context = useContext(ProcessViewContext);
  if (context === undefined) {
    return { isListView: false, processContextPath: '/editor' };
  }
  return context;
}

export function ProcessViewProvider({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: string;
}) {
  const isListView = mode === 'list';
  const processContextPath = isListView ? '/list' : '/editor';

  return (
    <ProcessViewContext.Provider value={{ isListView, processContextPath }}>
      {children}
    </ProcessViewContext.Provider>
  );
}
