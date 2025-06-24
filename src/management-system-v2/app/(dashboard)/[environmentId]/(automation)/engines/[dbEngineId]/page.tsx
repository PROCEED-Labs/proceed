import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { Button, Result, Skeleton, Space } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
import { type Engine } from '@/lib/engines/machines';
import { getDbEngineById } from '@/lib/data/db/engines';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';
import { engineRequest } from '@/lib/engines/endpoints/index';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import EngineDashboard from '@/components/engine-dashboard/server-component';
import SpaceLink from '@/components/space-link';

export type TableEngine = Engine & { id: string };

export default async function EnginesPage({
  params,
  searchParams,
}: {
  params: { dbEngineId: string; environmentId: string };
  searchParams: { engineId: string };
}) {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

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
