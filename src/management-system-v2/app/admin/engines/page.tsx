import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getEngines } from '@/lib/engines/endpoints/mqtt-endpoints';
import { Result, Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSystemAdminByUserId } from '@/lib/data/db/iam/system-admins';
import EnginesTable from './engines-table';
import { getMSConfig } from '@/lib/ms-config/ms-config';

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

export default async function EnginesPage() {
  const msConfig = await getMSConfig();

  if (!msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) return notFound();

  if (!msConfig.MQTT_SERVER_ADDRESS)
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
