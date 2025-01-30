import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import { getDeployments } from '@/lib/engines/deployment';
import { getProceedEngines } from '@/lib/engines/machines';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';
import { getSpaceEngines } from '@/lib/data/db/space-engines';
import { isUserErrorResponse } from '@/lib/user-error';
import { getDeployedProcessesFromSpaceEngines } from '@/lib/engines/space-engines-helpers';
import { getCurrentEnvironment } from '@/components/auth';

// TODO: handle multiple process deployments

// TODO: use something like Promise.any to resolve when we find the process
async function Deployment({ processId, spaceId }: { processId: string; spaceId: string }) {
  const [deployedInProceed, deployedInSpaceEngines] = await Promise.all([
    getProceedEngines().then((engines) => getDeployments(engines)),
    getSpaceEngines(spaceId).then((spaceEngines) => {
      if (isUserErrorResponse(spaceEngines)) return [];
      return getDeployedProcessesFromSpaceEngines(spaceEngines);
    }),
  ]);

  const deployments = deployedInProceed.concat(deployedInSpaceEngines);
  const selectedProcess = deployments.find((process) => process.definitionId === processId);

  if (!selectedProcess)
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );

  return <ProcessDeploymentView selectedProcess={selectedProcess} />;
}

export default async function Page({ params }: AsyncPageProps) {
  const { environmentId, processId } = await params;

  //TODO: authentication + authorization
  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);

  return (
    <Suspense
      fallback={
        <Content>
          <Skeleton />
        </Content>
      }
    >
      <Deployment processId={decodeURIComponent(processId)} spaceId={activeEnvironment.spaceId} />
    </Suspense>
  );
}
