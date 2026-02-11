import {
  getDeepConfigurationById,
  getlastVersion,
  getUserConfig,
  getVersion,
  syncOrganizationUsers,
} from '@/lib/data/db/machine-config';
import MachineConfigViewClient from './page-client';
import { getCurrentEnvironment } from '@/components/auth';

type MachineConfigProps = {
  params: Promise<{ environmentId: string; configId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const MachineConfigView: React.FC<MachineConfigProps> = async ({ params, searchParams }) => {
  const { environmentId, configId } = await params;
  const searchParamsResolved = await searchParams;
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);
  if (activeEnvironment.isOrganization) {
    await syncOrganizationUsers(activeEnvironment.spaceId);
  }
  const selectedVersionId = searchParamsResolved.version as string | undefined;
  const source = searchParamsResolved.source as string | undefined;

  // collect all machine dataset version selections
  const machineDatasetVersions: Record<string, string> = {};
  Object.keys(searchParamsResolved).forEach((key) => {
    if (key.startsWith('machineVersion_')) {
      const datasetId = key.replace('machineVersion_', '');
      machineDatasetVersions[datasetId] = searchParamsResolved[key] as string;
    }
  });

  let config;
  if (source === 'personal') {
    const dummyConfig = await getUserConfig(configId, environmentId);
    if ('error' in dummyConfig) {
      console.error(dummyConfig.error);
      return <p>{dummyConfig.error.message}</p>;
    } else {
      return <MachineConfigViewClient config={dummyConfig} source={source} />;
    }
  } else {
    if (selectedVersionId && Object.keys(machineDatasetVersions).length > 0) {
      // load specific TDS version with specific machine dataset versions
      const versionNumber = parseInt(selectedVersionId);
      config = await getVersion(configId, versionNumber, machineDatasetVersions);
    } else if (selectedVersionId) {
      // load specific TDS version with latest machine dataset versions
      const versionNumber = parseInt(selectedVersionId);
      config = await getlastVersion(configId, versionNumber);
    } else {
      // load latest TDS version (with or without specific machine versions)
      if (Object.keys(machineDatasetVersions).length > 0) {
        // get latest TDS version number first
        const latestConfig = await getDeepConfigurationById(configId);
        // TODO: yet not implemented at backend
        // assuming version 1 as latest
        config = await getVersion(configId, 1, machineDatasetVersions);
      } else {
        // load everything as latest
        config = await getDeepConfigurationById(configId);
      }
    }

    return <MachineConfigViewClient config={config} source={source} />;
  }
};

export default MachineConfigView;
