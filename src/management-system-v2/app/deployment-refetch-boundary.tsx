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
    async function refetchCycle() {
      if (!keepRunning) return;
      await refetchDeployments();

      // the user sets the interval in seconds so we have to convert to milliseconds
      setTimeout(refetchCycle, interval * 1000);
    }

    if (enabled && interval) refetchCycle();

    () => (keepRunning = false);
  }, [enabled, interval]);

  return children;
};

export default DeploymentRefetchBoundary;
