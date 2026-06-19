import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { Button, Skeleton } from 'antd';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LeftOutlined } from '@ant-design/icons';
import { getEngineById } from '@/lib/data/engines';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import EngineDashboard from '@/components/engine-dashboard/server-component';
import SpaceLink from '@/components/space-link';
import { isUserErrorResponse } from '@/lib/user-error';

export default async function EnginesPage(props: {
  params: Promise<{ engineId: string; environmentId: string }>;
}) {
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const engineId = decodeURIComponent(params.engineId || '');

  const { activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  const engine = await getEngineById(activeEnvironment.spaceId, engineId);

  if (isUserErrorResponse(engine)) {
    return notFound();
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
        engine={engine || undefined}
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
