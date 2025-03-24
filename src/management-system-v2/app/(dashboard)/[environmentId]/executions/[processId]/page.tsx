import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import { getDeployment } from '@/lib/engines/server-actions';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';
import { getCurrentEnvironment } from '@/components/auth';

async function Deployment({ processId, spaceId }: { processId: string; spaceId: string }) {
  const deployment = await getDeployment(spaceId, processId);

  if (!deployment) {
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );
  }

  return <ProcessDeploymentView processId={processId} initialDeploymentInfo={deployment} />;
}

export default async function Page({
  params,
}: {
  params: { processId: string; environmentId: string };
}) {
  //TODO: authentication + authorization
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
