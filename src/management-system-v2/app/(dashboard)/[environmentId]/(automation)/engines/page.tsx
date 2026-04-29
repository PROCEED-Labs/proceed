import Content from '@/components/content';
import { Skeleton, Spin } from 'antd';
import { notFound } from 'next/navigation';
import SavedEnginesList, { EngineStatus } from '@/components/saved-engines-list';
import { getEnginesWithMachines } from '@/lib/data/db/engines';
import { getCurrentEnvironment } from '@/components/auth';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { Engine as DBEngine } from '@prisma/client';
import { spaceURL } from '@/lib/utils';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { Engine } from '@/lib/engines/machines';

const getEngineStatus = async (engine: DBEngine & { machines: Engine[] }) => {
  if (engine.machines.length === 0) {
    return { online: false } as const;
  } else {
    return { online: true, engines: engine.machines } as const;
  }
};

type PageProps = { params: Promise<{ environmentId: string }> };

const EnginesPage = async ({ environmentId }: { environmentId: string }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);

  const machinesSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.process-engines',
  );

  if (machinesSettings.active === false) {
    return notFound();
  }

  const engines = await getEnginesWithMachines(activeEnvironment.spaceId, ability);
  console.log(engines);

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
    <SavedEnginesList
      savedEngines={enginesWithStatus}
      engineDashboardLinkPrefix={spaceURL(activeEnvironment, '/engines')}
    />
  );
};

const Page = async (props: PageProps) => {
  const params = await props.params;

  const { ability } = await getCurrentEnvironment(params.environmentId);
  if (!ability.can('view', 'Machine')) return <UnauthorizedFallback />;

  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton />}>
        <EnginesPage environmentId={params.environmentId} />
      </Suspense>
    </Content>
  );
};

export default Page;
