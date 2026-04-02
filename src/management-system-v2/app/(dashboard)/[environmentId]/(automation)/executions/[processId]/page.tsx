import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';
import { getCurrentEnvironment } from '@/components/auth';
import { getProcessDeployments } from '@/lib/data/deployment';
import { isUserErrorResponse } from '@/lib/user-error';
import { DeployedProcessInfo } from '@/lib/engines/deployment';
import { asyncForEach } from '@/lib/helpers/javascriptHelpers';
import { getProcessVersionBpmn } from '@/lib/data/db/process';
import { getDefinitionsName } from '@proceed/bpmn-helper';
import { DeploymentInfo } from '../deployment-hook';

async function Deployment({ processId, spaceId }: { processId: string; spaceId: string }) {
  const deployments = await getProcessDeployments(spaceId, processId);

  if (isUserErrorResponse(deployments)) throw deployments;

  if (!deployments.length) {
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );
  }

  const deployment: DeploymentInfo = {
    definitionId: processId,
    versions: [],
    instances: [],
  };

  await asyncForEach(deployments, async (d) => {
    const bpmn = await getProcessVersionBpmn(d.processId, d.versionId);
    deployment.versions.push({
      versionId: d.versionId,
      bpmn,
      deploymentDate: +d.deployTime,
      definitionName: await getDefinitionsName(bpmn),
      // TODO: store this in the deployment db table
      deploymentMethod: 'dynamic',
      needs: { html: [], images: [], imports: [] },
      versionName: d.version.name,
      versionDescription: d.version.description,
      machines: d.machineIds,
    });
    deployment.instances.push(
      ...(d.instances.map((i) => i.state) as DeployedProcessInfo['instances']),
    );
  });

  return <ProcessDeploymentView processId={processId} initialDeploymentInfo={deployment} />;
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
