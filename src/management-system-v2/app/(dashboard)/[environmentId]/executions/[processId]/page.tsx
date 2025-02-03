import { Result, Skeleton } from 'antd';
import Content from '@/components/content';
import { getDeployments } from '@/lib/engines/deployment';
import { getProceedEngines } from '@/lib/engines/machines';
import ProcessDeploymentView from './process-deployment-view';
import { Suspense } from 'react';
import { getCurrentEnvironment } from '@/components/auth';

// TODO: handle multiple process deployments

export default async function Page({
  params,
}: {
  params: { processId: string; environmentId: string };
}) {
  //TODO: authentication + authorization
  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);

  return <ProcessDeploymentView processId={decodeURIComponent(params.processId)} />;
}
