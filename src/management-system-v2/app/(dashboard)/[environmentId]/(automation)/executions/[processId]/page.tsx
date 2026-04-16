import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';
import { getProcessDeployments } from '@/lib/data/deployment';
import { isUserErrorResponse } from '@/lib/user-error';

async function Deployment({ processId, spaceId }: { processId: string; spaceId: string }) {
  let deployments = await getProcessDeployments(spaceId, processId);

  if (isUserErrorResponse(deployments)) throw deployments;

  deployments = deployments.filter((deployment) => !deployment.deleted);

  if (!deployments.length) {
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );
  }

  return <ProcessDeploymentView processId={processId} initialDeployments={deployments} />;
}

export default async function Page(props: {
  params: Promise<{ processId: string; environmentId: string }>;
}) {
  const params = await props.params;
  //TODO: authentication + authorization

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
        spaceId={decodeURIComponent(params.environmentId)}
      />
    </Suspense>
  );
}
