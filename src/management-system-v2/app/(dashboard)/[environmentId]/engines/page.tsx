import Content from '@/components/content';
import { Skeleton } from 'antd';
import { notFound } from 'next/navigation';
import SavedEnginesList from './saved-engines-list';
import { getSpaceEngines } from '@/lib/data/db/space-engines';
import { getCurrentEnvironment } from '@/components/auth';
import Ability from '@/lib/ability/abilityHelper';
import { Suspense } from 'react';
import { enableUseDB } from 'FeatureFlags';
import { getMSConfig } from '@/lib/ms-config/ms-config';

const SavedEngines = async ({ spaceId, ability }: { spaceId: string; ability: Ability }) => {
  const engines = await getSpaceEngines(spaceId, ability);

  return <SavedEnginesList savedEngines={engines} />;
};

const EnginesPage = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION || !enableUseDB) {
    return notFound();
  }

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);

  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton />}>
        <SavedEngines spaceId={activeEnvironment.spaceId} ability={ability} />
      </Suspense>
    </Content>
  );
};

export default EnginesPage;
