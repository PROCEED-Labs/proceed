import Content from '@/components/content';
import { Skeleton, Spin } from 'antd';
import { notFound } from 'next/navigation';
import SavedEnginesList, { EngineStatus } from '@/components/saved-engines-list';
import { getDbEngines } from '@/lib/data/db/engines';
import { getCurrentEnvironment } from '@/components/auth';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';
import { Engine as DBEngine } from '@prisma/client';
import { spaceURL } from '@/lib/utils';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

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
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { activeEnvironment, ability } = currentSpace.value;

  const machinesSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.process-engines',
  );
  if (machinesSettings.isErr()) {
    return errorResponse(machinesSettings);
  }

  if (machinesSettings.value.active === false) {
    return notFound();
  }

  const engines = await getDbEngines(activeEnvironment.spaceId, ability);
  if (engines.isErr()) {
    return errorResponse(engines);
  }

  const enginesWithStatus = engines.value.map((engine) => {
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
