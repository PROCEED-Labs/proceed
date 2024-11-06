import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEngines, mqttRequest } from '@/lib/engines/mqtt-endpoints';
import { Result, Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { env } from 'process';
import { Suspense } from 'react';
import { getSystemAdminByUserId } from '@/lib/data/DTOs';
import { endpointBuilder } from '@/lib/engines/endpoint';
import EngineOverview from './engine-overview';

export type TableEngine = Awaited<ReturnType<typeof getEngines>>[number] & { id: string };

async function Engine({ engineId }: { engineId: string }) {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');
  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  try {
    const engine = await mqttRequest(engineId, endpointBuilder('get', '/machine/'), {
      method: 'GET',
    });

    return <EngineOverview engine={engine} />;
  } catch (e) {
    return <Result status="500" title="Error" subTitle="Couldn't fetch engines" />;
  }
}

export default function EnginesPage({ params }: { params: { engineId: string } }) {
  if (!env.NEXT_PUBLIC_ENABLE_EXECUTION) return notFound();

  // For now engines don't have a name
  const engineId = decodeURIComponent(params.engineId);

  return (
    <Content title={`Engine: ${engineId}`}>
      <Suspense fallback={<Skeleton active />}>
        <Engine engineId={engineId} />
      </Suspense>
    </Content>
  );
}

export const dynamic = 'force-dynamic';
