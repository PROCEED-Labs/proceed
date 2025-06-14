import Content from '@/components/content';
import { Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import SavedEnginesList from '@/components/saved-engines-list';
import { getCurrentUser } from '@/components/auth';
import { Suspense } from 'react';
import { enableUseDB } from 'FeatureFlags';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getDbEngines } from '@/lib/data/db/engines';

async function SavedEngines() {
  const { systemAdmin } = await getCurrentUser();
  return <SavedEnginesList savedEngines={await getDbEngines(null, undefined, systemAdmin)} />;
}

async function EnginesPage() {
  const msConfig = await getMSConfig();

  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION || !enableUseDB) {
    return notFound();
  }

  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return redirect('/');

  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton />}>
        <SavedEngines />
      </Suspense>
    </Content>
  );
}

export default EnginesPage;
