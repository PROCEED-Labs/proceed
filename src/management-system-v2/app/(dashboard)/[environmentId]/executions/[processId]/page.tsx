import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';
import { getDbEngines } from '@/lib/data/db/engines';
import { getDeployedProcessesFromSavedEngines } from '@/lib/engines/saved-engines-helpers';
import { getCurrentEnvironment } from '@/components/auth';

// TODO: handle multiple process deployments

// TODO: use something like Promise.any to resolve when we find the process
async function Deployment({ processId, spaceId }: { processId: string; spaceId: string }) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(spaceId);

  const [spaceEngines, proceedEngines] = await Promise.all([
    getDbEngines(activeEnvironment.spaceId, ability),
    getDbEngines(null, ability, 'dont-check'),
  ]);
  const deployments = await getDeployedProcessesFromSavedEngines([
    ...spaceEngines,
    ...proceedEngines,
  ]);

  //TODO: authorization
  const selectedProcess = deployments.find((process) => process.definitionId === processId);

  if (!selectedProcess)
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );

  return <ProcessDeploymentView selectedProcess={selectedProcess} />;
}

export default async function Page({
  params,
}: {
  params: { processId: string; environmentId: string };
}) {
  const { activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  return (
    <Suspense
      fallback={
        <Content>
          <Skeleton />
        </Content>
      }
    >
      <Deployment
        processId={decodeURIComponent(params.processId)}
        spaceId={activeEnvironment.spaceId}
      />
    </Suspense>
  );
}
