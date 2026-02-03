import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import { getDeployment } from '@/lib/engines/server-actions';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';
import { getCurrentEnvironment } from '@/components/auth';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { isUserErrorResponse } from '@/lib/server-error-handling/user-error';
import { err } from 'neverthrow';

async function Deployment({ processId, spaceId }: { processId: string; spaceId: string }) {
  const deployment = await getDeployment(spaceId, processId);
  if (isUserErrorResponse(deployment)) return errorResponse(err());

  if (!deployment) {
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );
  }

  return <ProcessDeploymentView processId={processId} initialDeploymentInfo={deployment} />;
}

export default async function Page(props: {
  params: Promise<{ processId: string; environmentId: string }>;
}) {
  const params = await props.params;
  //TODO: authentication + authorization
  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { activeEnvironment } = currentSpace.value;

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
