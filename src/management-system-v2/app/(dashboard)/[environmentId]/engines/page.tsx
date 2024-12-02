import Content from '@/components/content';
import { Skeleton } from 'antd';
import { notFound } from 'next/navigation';
import SavedEnginesList from './saved-engines-list';
import { getSpaceEngines } from '@/lib/data/DTOs';
import { getCurrentEnvironment } from '@/components/auth';
import Ability from '@/lib/ability/abilityHelper';
import { Suspense } from 'react';

const SavedEngines = async ({ spaceId, ability }: { spaceId: string; ability: Ability }) => {
  const engines = await getSpaceEngines(spaceId, ability);

  return <SavedEnginesList savedEngines={engines} />;
};

const EnginesPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!process.env.NEXT_PUBLIC_ENABLE_EXECUTION) {
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
