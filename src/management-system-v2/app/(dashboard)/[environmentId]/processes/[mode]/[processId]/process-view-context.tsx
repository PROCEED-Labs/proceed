'use client';

import { createContext, useContext } from 'react';

type ProcessViewContextType = {
  isListView: boolean;
  isEditorView: boolean;
};

const ProcessViewContext = createContext<ProcessViewContextType | undefined>(undefined);

export function useProcessView() {
  const context = useContext(ProcessViewContext);
  if (context === undefined) {
    return { isListView: false, isEditorView: true };
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
  const isEditorView = mode === 'editor';

  return (
    <ProcessViewContext.Provider value={{ isListView, isEditorView }}>
      {children}
    </ProcessViewContext.Provider>
  );
}
