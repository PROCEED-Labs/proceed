'use client';

import { refetchDeployments } from '@/lib/executions/deployment-server-actions';
import { useEffect } from 'react';

const DeploymentRefetchBoundary: React.FC<
  React.PropsWithChildren<{ enabled?: boolean; interval: number }>
> = ({ children, enabled = false, interval }) => {
  useEffect(() => {
    // as long as as user is connected they will trigger the backend to keep the deployment
    // information up to date
    let keepRunning = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function refetchCycle() {
      if (!keepRunning) return;
      await refetchDeployments();

      // the user sets the interval in seconds so we have to convert to milliseconds
      timeoutId = setTimeout(refetchCycle, interval * 1000);
    }

    if (enabled && interval) refetchCycle();

    return () => {
      keepRunning = false;
      clearTimeout(timeoutId);
    };
  }, [enabled, interval]);

  return children;
};

export default DeploymentRefetchBoundary;
