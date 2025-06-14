import Content from '@/components/content';
import { Skeleton } from 'antd';
import { notFound } from 'next/navigation';
import SavedEnginesList from '@/components/saved-engines-list';
import { getDbEngines } from '@/lib/data/db/engines';
import { getCurrentEnvironment } from '@/components/auth';
import Ability from '@/lib/ability/abilityHelper';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { enableUseDB } from 'FeatureFlags';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';

const SavedEngines = async ({ spaceId, ability }: { spaceId: string; ability: Ability }) => {
  const engines = await getDbEngines(spaceId, ability);

  return <SavedEnginesList savedEngines={engines} />;
};

const EnginesPage = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

  if (!enableUseDB) {
    return notFound();
  }

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);

  const machinesSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.machines',
    ability,
  );

  if (machinesSettings.active === false) {
    return notFound();
  }

  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton />}>
        <SavedEngines spaceId={activeEnvironment.spaceId} ability={ability} />
      </Suspense>
    </Content>
  );
};

export default EnginesPage;
