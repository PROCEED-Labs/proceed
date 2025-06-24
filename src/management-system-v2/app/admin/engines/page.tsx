import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { Result, Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import EnginesTable from './engines-table';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getDbEngines } from '@/lib/data/db/engines';

async function Engines() {
  const { session, systemAdmin } = await getCurrentUser();
  if (!session || !systemAdmin) redirect('/');

  try {
    const savedEngines = await getDbEngines(null, undefined, systemAdmin);

    return <EnginesTable engines={savedEngines} />;
  } catch (e) {
    return <Result status="500" title="Error" subTitle="Couldn't fetch engines" />;
  }
}

export default async function EnginesPage() {
  const msConfig = await getMSConfig();

  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton active />}>
        <Engines />
      </Suspense>
    </Content>
  );
}

export const dynamic = 'force-dynamic';
