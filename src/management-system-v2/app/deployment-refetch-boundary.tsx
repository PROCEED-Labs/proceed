'use client';

import { refetchDeployments } from '@/lib/executions/deployment-server-actions';
import { useEffect } from 'react';

const DeploymentRefetchBoundary: React.FC<React.PropsWithChildren> = ({ children }) => {
  useEffect(() => {
    // as long as as user is connected they will trigger the backend to keep the deployment
    // information up to date
    let keepRunning = true;
    async function refetchCycle() {
      if (!keepRunning) return;
      await refetchDeployments();

      setTimeout(refetchCycle, 5000);
    }

    refetchCycle();

    () => (keepRunning = false);
  }, []);

  return children;
};

export default DeploymentRefetchBoundary;
