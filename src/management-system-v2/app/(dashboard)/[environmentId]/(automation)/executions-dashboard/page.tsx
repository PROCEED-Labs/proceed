import Content from '@/components/content';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import DashboardView from './dashboard-view';
import UnauthorizedFallback from '@/components/unauthorized-fallback';

const Page = async (props: any) => {
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);
  const { systemAdmin, userId } = await getCurrentUser();

  if (!ability.can('view', 'Machine') || !ability.can('view', 'Execution'))
    return <UnauthorizedFallback />;

  const machinesSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.dashboard',
    ability,
  );

  if (machinesSettings.active === false) {
    return notFound();
  }

  // determine user role based on abilities
  let userRole: 'user' | 'manager' | 'admin' = 'user';
  if (systemAdmin) {
    userRole = 'admin';
  } else if (
    ability.can('manage', 'User') ||
    ability.can('manage', 'RoleMapping') ||
    ability.can('manage', 'Role')
  ) {
    userRole = 'manager';
  }

  return (
    <Content title="Dashboard">
      <DashboardView userRole={userRole} userId={userId} spaceId={activeEnvironment.spaceId} />
    </Content>
  );
};

export default Page;
