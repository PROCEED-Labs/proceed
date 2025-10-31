import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { Button, Skeleton } from 'antd';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LeftOutlined } from '@ant-design/icons';
import { type Engine } from '@/lib/engines/machines';
import { getDbEngineById } from '@/lib/data/db/engines';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import EngineDashboard from '@/components/engine-dashboard/server-component';
import SpaceLink from '@/components/space-link';

export type TableEngine = Engine & { id: string };

export default async function EnginesPage(props: {
  params: Promise<{ dbEngineId: string; environmentId: string }>;
  searchParams: Promise<{ engineId: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const dbEngineId = decodeURIComponent(params.dbEngineId);
  const engineId = decodeURIComponent(searchParams.engineId || '');

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  const dbEngine = await getDbEngineById(dbEngineId, activeEnvironment.spaceId, ability);

  return (
    <Suspense
      fallback={
        <Content>
          <Skeleton active />
        </Content>
      }
    >
      <EngineDashboard
        dbEngine={dbEngine}
        engineId={engineId}
        backButton={
          <SpaceLink href="/engines">
            <Button icon={<LeftOutlined />} type="text">
              Engines
            </Button>
          </SpaceLink>
        }
      />
      ;
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
