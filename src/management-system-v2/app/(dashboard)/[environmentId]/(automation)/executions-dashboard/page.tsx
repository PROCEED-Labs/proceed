import Content from '@/components/content';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import DashboardView from './dashboard-view';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const Page = async (props: any) => {
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { activeEnvironment, ability } = currentSpace.value;

  const machinesSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.dashboard',
    ability,
  );
  if (machinesSettings.isErr()) {
    return errorResponse(machinesSettings);
  }

  if (machinesSettings.value.active === false) {
    return notFound();
  }

  return (
    <Content title="Dashboard">
      <DashboardView />
    </Content>
  );
};

export default Page;
