import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';
import { getCurrentEnvironment } from '@/components/auth';
import { isUserErrorResponse } from '@/lib/user-error';
import { getProcessDeployments } from '@/lib/data/deployment';

async function Deployment({ processId, spaceId }: { processId: string; spaceId: string }) {
  const deployments = await getProcessDeployments(spaceId, processId, undefined, true, true);

  if (isUserErrorResponse(deployments)) {
    return (
      <Content>
        <Result status="404" title={deployments.error.message} />
      </Content>
    );
  }

  if (!deployments.length) {
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );
  }

  return <ProcessDeploymentView processId={processId} />;
}

export default async function Page(props: {
  params: Promise<{ processId: string; environmentId: string }>;
}) {
  const params = await props.params;
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
