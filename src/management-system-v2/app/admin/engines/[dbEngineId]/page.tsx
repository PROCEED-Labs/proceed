import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { Button, Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
import { type Engine } from '@/lib/engines/machines';
import { getDbEngineById } from '@/lib/data/db/engines';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import EngineDashboard from '@/components/engine-dashboard/server-component';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

export type TableEngine = Engine & { id: string };

export default async function EnginesPage(props: {
  params: Promise<{ dbEngineId: string }>;
  searchParams: Promise<{ engineId: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const user = await getCurrentUser();
  if (user.isErr()) {
    return errorResponse(user);
  }

  if (!user.value.systemAdmin) redirect('/');

  const dbEngineId = decodeURIComponent(params.dbEngineId);
  const engineId = decodeURIComponent(searchParams.engineId || '');
  const dbEngine = await getDbEngineById(dbEngineId, null, undefined, 'dont-check');
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
