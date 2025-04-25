import Content from '@/components/content';
import { Skeleton } from 'antd';
import { notFound } from 'next/navigation';
<<<<<<< HEAD
import SavedEnginesList from '@/components/saved-engines-list';
import { getDbEngines } from '@/lib/data/db/engines';
=======
import SavedEnginesList from './saved-engines-list';
import { getSpaceEngines } from '@/lib/data/db/space-engines';
>>>>>>> origin/main
import { getCurrentEnvironment } from '@/components/auth';
import Ability from '@/lib/ability/abilityHelper';
import { Suspense } from 'react';
import { enableUseDB } from 'FeatureFlags';
import { env } from '@/lib/env-vars';

const SavedEngines = async ({ spaceId, ability }: { spaceId: string; ability: Ability }) => {
  const engines = await getDbEngines(spaceId, ability);

  return <SavedEnginesList savedEngines={engines} />;
};

const EnginesPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION || !enableUseDB) {
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
