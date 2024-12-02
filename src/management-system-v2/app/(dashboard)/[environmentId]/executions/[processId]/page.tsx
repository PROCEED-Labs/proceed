import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import { getDeployments } from '@/lib/engines/deployment';
import { getEngines } from '@/lib/engines/machines';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';

async function Deployment({ processId }: { processId: string }) {
  const engines = await getEngines();
  const deployments = await getDeployments(engines);

  const selectedProcess = deployments.find((process) => process.definitionId === processId);

  if (!selectedProcess)
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );

  return <ProcessDeploymentView selectedProcess={selectedProcess} />;
}

export default async function Page({ params: { processId } }: { params: { processId: string } }) {
  //TODO: authentication + authorization

  return (
    <Suspense
      fallback={
        <Content>
          <Skeleton />
        </Content>
      }
    >
      <Deployment processId={processId} />
    </Suspense>
  );
}
