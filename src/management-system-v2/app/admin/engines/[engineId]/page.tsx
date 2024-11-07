import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEngines, mqttRequest } from '@/lib/engines/mqtt-endpoints';
import { Button, Result, Skeleton, Space, Tag } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { env } from 'process';
import { Suspense } from 'react';
import { getSystemAdminByUserId } from '@/lib/data/DTOs';
import { endpointBuilder } from '@/lib/engines/endpoint';
import EngineOverview from './engine-overview';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';

export type TableEngine = Awaited<ReturnType<typeof getEngines>>[number] & { id: string };

async function Engine({ engineId }: { engineId: string }) {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');
  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  const backButton = (
    <Link href="/admin/engines">
      <Button icon={<LeftOutlined />} type="text">
        Engines
      </Button>
    </Link>
  );

  try {
    const engine = await mqttRequest(engineId, endpointBuilder('get', '/machine/'), {
      method: 'GET',
    });

    return (
      <Content
        title={
          <Space style={{ alignItems: 'center' }}>
            {backButton}
            Engine: {engine.name}{' '}
            <Tag color={engine.online ? 'success' : 'error'}>
              {engine.online ? 'online' : 'offline'}
            </Tag>
          </Space>
        }
      >
        <EngineOverview engine={engine} />
      </Content>
    );
  } catch (e) {
    console.error(e);
    return (
      <Content title={backButton}>
        <Result status="500" title="Error" subTitle="Couldn't fetch engines" />
      </Content>
    );
  }
}

export default function EnginesPage({ params }: { params: { engineId: string } }) {
  if (!env.NEXT_PUBLIC_ENABLE_EXECUTION) return notFound();

  // For now engines don't have a name
  const engineId = decodeURIComponent(params.engineId);

  return (
    <Suspense
      fallback={
        <Content>
          <Skeleton active />
        </Content>
      }
    >
      <Engine engineId={engineId} />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
