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
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

export type TableEngine = Engine & { id: string };

export default async function EnginesPage({
  params,
  searchParams,
}: {
  params: { dbEngineId: string; environmentId: string };
  searchParams: { engineId: string };
}) {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const dbEngineId = decodeURIComponent(params.dbEngineId);
  const engineId = decodeURIComponent(searchParams.engineId || '');

  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability, activeEnvironment } = currentSpace.value;
  const dbEngine = await getDbEngineById(dbEngineId, activeEnvironment.spaceId, ability);
  if (dbEngine.isErr()) {
    return errorResponse(dbEngine);
  }

  return (
    <Suspense
      fallback={
        <Content>
          <Skeleton active />
        </Content>
      }
    >
      <EngineDashboard
        dbEngine={dbEngine.value}
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
