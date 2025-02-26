import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { Result, Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import EnginesTable from './engines-table';
import { env } from '@/lib/env-vars';
import { getDbEngines } from '@/lib/data/db/engines';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';

async function Engines() {
  const { session, systemAdmin } = await getCurrentUser();
  if (!session || !systemAdmin) redirect('/');

  try {
    const savedEngines = await getDbEngines(null, undefined, systemAdmin);
    const engines = await savedEnginesToEngines(savedEngines);

    return <EnginesTable engines={engines} />;
  } catch (e) {
    return <Result status="500" title="Error" subTitle="Couldn't fetch engines" />;
  }
}

export default function EnginesPage() {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton active />}>
        <Engines />
      </Suspense>
    </Content>
  );
}

export const dynamic = 'force-dynamic';
