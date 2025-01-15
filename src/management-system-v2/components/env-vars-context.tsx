'use client';

import type { PublicEnv } from '@/lib/env-vars';
import { createContext, ReactNode } from 'react';

export const EnvVarsContext = createContext<PublicEnv>({});

export const EnvVarsProvider = ({ children, env }: { children: ReactNode; env: PublicEnv }) => {
  return <EnvVarsContext.Provider value={env}>{children}</EnvVarsContext.Provider>;
};
