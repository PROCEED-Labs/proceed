import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { Button, Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
import { type EngineWithConnections } from '@/lib/engines/types';
import { getEngineById } from '@/lib/data/engines';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import EngineDashboard from '@/components/engine-dashboard/server-component';
import { isUserErrorResponse } from '@/lib/user-error';

export default async function EnginesPage(props: { params: Promise<{ engineId: string }> }) {
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const user = await getCurrentUser();
  if (!user.systemAdmin) redirect('/');

  const engineId = decodeURIComponent(params.engineId || '');
  const engine = await getEngineById(null, engineId);

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
          <Link href="/admin/engines">
            <Button icon={<LeftOutlined />} type="text">
              Engines
            </Button>
          </Link>
        }
      />
      ;
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
