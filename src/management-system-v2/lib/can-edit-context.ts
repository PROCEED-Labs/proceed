import { createContext, useContext } from 'react';

export const CanEditContext = createContext<boolean>(true);

export function useCanEdit() {
  return useContext(CanEditContext);
}
