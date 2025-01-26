import { createContext } from 'react';

type BuilderContextType = {
  editingEnabled: boolean;
};

const BuilderContext = createContext<BuilderContextType>({ editingEnabled: false });

export default BuilderContext;
