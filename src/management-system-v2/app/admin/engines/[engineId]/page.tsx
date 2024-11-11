import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEngines, mqttRequest } from '@/lib/engines/mqtt-endpoints';
import { Button, Result, Skeleton, Space, Tabs } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { env } from 'process';
import { Suspense } from 'react';
import { getSystemAdminByUserId } from '@/lib/data/DTOs';
import { endpointBuilder } from '@/lib/engines/endpoint';
import EngineOverview from './engine-overview';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
import ConfigurationTable from './configuration-table';

export type TableEngine = Awaited<ReturnType<typeof getEngines>>[number] & { id: string };

async function Engine({ engineId }: { engineId: string }) {
  const backButton = (
    <Link href="/admin/engines">
      <Button icon={<LeftOutlined />} type="text">
        Engines
      </Button>
    </Link>
  );

  try {
    const calls = await Promise.allSettled([
      mqttRequest(engineId, endpointBuilder('get', '/configuration/'), {
        method: 'GET',
      }),
      mqttRequest(engineId, endpointBuilder('get', '/machine/'), {
        method: 'GET',
      }),
    ]);

    const configuration = calls[0].status === 'fulfilled' ? calls[0].value : null;
    const engine = calls[1].status === 'fulfilled' ? calls[1].value : null;

    // We still render dashboard if we can't fetch the configuration
    if (!engine) throw new Error('Failed to fetch engine');

    return (
      <Content
        title={
          <Space style={{ alignItems: 'center' }}>
            {backButton} {engine.name}
          </Space>
        }
      >
        <Tabs
          style={{ height: '100%' }}
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: <EngineOverview engine={engine} />,
            },
            {
              key: 'configuration',
              label: 'Configuration',
              children: <ConfigurationTable configuration={configuration} engine={engine} />,
            },
          ]}
        />
      </Content>
    );
  } catch (e) {
    return (
      <Content title={backButton}>
        <Result status="500" title="Error" subTitle="Couldn't fetch engines" />
      </Content>
    );
  }
}

export default async function EnginesPage({ params }: { params: { engineId: string } }) {
  if (!env.NEXT_PUBLIC_ENABLE_EXECUTION) return notFound();

  const user = await getCurrentUser();
  if (!user.session) redirect('/');
  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

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
