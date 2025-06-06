'use client';

import type { PublicMSConfig } from '@/lib/ms-config/config-schema';
import { createContext, ReactNode } from 'react';

export const EnvVarsContext = createContext<PublicMSConfig>({} as any);

export const EnvVarsProvider = ({
  children,
  env,
}: {
  children: ReactNode;
  env: PublicMSConfig;
}) => {
  return <EnvVarsContext.Provider value={env}>{children}</EnvVarsContext.Provider>;
};
