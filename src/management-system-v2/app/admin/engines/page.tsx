import Content from '@/components/content';
import { Skeleton, Spin } from 'antd';
import { notFound, redirect } from 'next/navigation';
import SavedEnginesList, { EngineStatus } from '@/components/saved-engines-list';
import { getDbEngines } from '@/lib/data/db/engines';
import { getCurrentUser } from '@/components/auth';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';
import { Engine as DBEngine } from '@prisma/client';

const getEngineStatus = async (engine: DBEngine) => {
  const engines = await savedEnginesToEngines([engine]);

  if (engines.length === 0) {
    return { online: false } as const;
  } else {
    return { online: true, engines } as const;
  }
};

const EnginesPage = async () => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return redirect('/');

  const engines = await getDbEngines(null, undefined, systemAdmin);

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
