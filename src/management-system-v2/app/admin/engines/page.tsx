import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEngines } from '@/lib/engines/mqtt-endpoints';
import { Result, Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSystemAdminByUserId } from '@/lib/data/DTOs';
import EnginesTable from './engines-table';
import { env } from '@/lib/env-vars';

export type TableEngine = Awaited<ReturnType<typeof getEngines>>[number] & { name: string };

async function Engines() {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');
  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  try {
    const engines = (await getEngines()).map((e) => ({ ...e, name: e.id }));

    return <EnginesTable engines={engines} />;
  } catch (e) {
    console.error(e);
    return <Result status="500" title="Error" subTitle="Couldn't fetch engines" />;
  }
}

export default function EnginesPage() {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

  if (!env.MQTT_SERVER_ADDRESS)
    return <Result status="500" title="Error" subTitle="No MQTT server address configured" />;

  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton active />}>
        <Engines />
      </Suspense>
    </Content>
  );
}

export const dynamic = 'force-dynamic';
