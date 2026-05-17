import Content from '@/components/content';
import { notFound } from 'next/navigation';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import DashboardView from './dashboard-view';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { getDeployedProcessesFromSavedEngines } from '@/lib/engines/saved-engines-helpers';
import { getDbEngines } from '@/lib/data/db/engines';
import { isUserErrorResponse } from '@/lib/user-error';

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

  // fetch deployed processes and engines
  const [deployedData, enginesData] = await Promise.all([
    // fetch deployed processes from engines
    (async () => {
      try {
        const [globalEngines, spaceEngines] = await Promise.all([
          getDbEngines(null, ability, 'dont-check'),
          getDbEngines(activeEnvironment.spaceId, ability),
        ]);

        const spaceEnginesList = isUserErrorResponse(spaceEngines) ? [] : spaceEngines;

        const [deployedInGlobal, deployedInSpace] = await Promise.all([
          getDeployedProcessesFromSavedEngines(globalEngines),
          getDeployedProcessesFromSavedEngines(spaceEnginesList),
        ]);

        // combine and remap ids
        const allDeployed = deployedInGlobal.concat(deployedInSpace).map((process: any) => {
          const remapped = { ...process };
          remapped.id = process.definitionId;
          delete remapped.definitionId;

          // add name from latest version
          let latestDeploymentIdx = remapped.versions.length - 1;
          for (let i = remapped.versions.length - 2; i >= 0; i--) {
            if (remapped.versions[i].versionId > remapped.versions[latestDeploymentIdx].versionId) {
              latestDeploymentIdx = i;
            }
          }
          const latestDeployment = remapped.versions[latestDeploymentIdx];
          remapped.name = latestDeployment.definitionName || latestDeployment.versionName;

          return remapped;
        });

        return allDeployed;
      } catch (error) {
        console.error('Error fetching deployed processes:', error);
        return [];
      }
    })(),

    // fetch engines
    (async () => {
      try {
        const [globalEngines, spaceEngines] = await Promise.all([
          getDbEngines(null, ability, 'dont-check'),
          getDbEngines(activeEnvironment.spaceId, ability),
        ]);

        const spaceEnginesList = isUserErrorResponse(spaceEngines) ? [] : spaceEngines;
        return globalEngines.concat(spaceEnginesList);
      } catch (error) {
        console.error('Error fetching engines:', error);
        return [];
      }
    })(),
  ]);

  return (
    <Content title="Dashboard">
      <DashboardView
        deployedProcesses={deployedData}
        engines={enginesData}
        userRole={userRole}
        userId={userId}
        spaceId={activeEnvironment.spaceId}
      />
    </Content>
  );
};

export default Page;
