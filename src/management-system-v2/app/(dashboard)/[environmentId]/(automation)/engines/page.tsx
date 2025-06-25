import Content from '@/components/content';
import { Skeleton, Spin } from 'antd';
import { notFound } from 'next/navigation';
import SavedEnginesList, { EngineStatus } from '@/components/saved-engines-list';
import { getDbEngines } from '@/lib/data/db/engines';
import { getCurrentEnvironment } from '@/components/auth';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { enableUseDB } from 'FeatureFlags';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';
import { Engine as DBEngine } from '@prisma/client';
import { spaceURL } from '@/lib/utils';

const getEngineStatus = async (engine: DBEngine) => {
  const engines = await savedEnginesToEngines([engine]);

  if (engines.length === 0) {
    return { online: false } as const;
  } else {
    return { online: true, engines } as const;
  }
};

const EnginesPage = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);

  const machinesSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.process-engines',
    ability,
  );

  if (machinesSettings.active === false) {
    return notFound();
  }

  const engines = await getDbEngines(activeEnvironment.spaceId, ability);

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

const Page = ({ params }: any) => {
  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton />}>
        <EnginesPage params={params} />
      </Suspense>
    </Content>
  );
};

export default Page;
