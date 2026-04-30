import Content from '@/components/content';
import { Skeleton, Spin } from 'antd';
import { notFound, redirect } from 'next/navigation';
import SavedEnginesList, { EngineStatus } from '@/components/saved-engines-list';
import { getEnginesWithMachines } from '@/lib/data/db/engines';
import { getCurrentUser } from '@/components/auth';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { Engine as DBEngine } from '@prisma/client';
import { Engine } from '@/lib/engines/machines';

const getEngineStatus = async (engine: DBEngine & { machines: Engine[] }) => {
  if (engine.machines.length === 0) {
    return { online: false } as const;
  } else {
    return { online: true, engines: engine.machines } as const;
  }
};

const EnginesPage = async () => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return redirect('/');

  const engines = await getEnginesWithMachines(null, undefined, systemAdmin);

  const enginesWithStatus = engines.map((engine) => {
    return {
      ...engine,
      status: (
        <Suspense fallback={<Spin spinning />}>
          <EngineStatus engineId={engine.id} status={getEngineStatus(engine)} />
        </Suspense>
      ),
    };
  });

  return (
    <SavedEnginesList savedEngines={enginesWithStatus} engineDashboardLinkPrefix="/admin/engines" />
  );
};

const Page = () => {
  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton />}>
        <EnginesPage />
      </Suspense>
    </Content>
  );
};

export default Page;
