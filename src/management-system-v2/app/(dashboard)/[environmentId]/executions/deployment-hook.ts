import { useEnvironment } from '@/components/auth-can';
import { DeployedProcessInfo, InstanceInfo, VersionInfo } from '@/lib/engines/deployment';
import { getDeployment } from '@/lib/engines/server-actions';
import { deepEquals } from '@/lib/helpers/javascriptHelpers';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

const mergeInstance = (newInstance: InstanceInfo, oldInstance?: InstanceInfo) => {
  if (!oldInstance) return newInstance;

  let hasChanges = false;

  const toMerge: (keyof InstanceInfo)[] = [
    'log',
    'tokens',
    'adaptationLog',
    'variables',
    'userTasks',
    'instanceState',
  ];

  toMerge.forEach((key) => {
    if (!deepEquals(oldInstance[key], newInstance[key])) {
      hasChanges = true;
    } else {
      newInstance[key] = oldInstance[key] as never;
    }
  });

  return hasChanges ? newInstance : oldInstance;
};

const mergeVersion = (newVersion: VersionInfo, oldVersion?: VersionInfo) => {
  if (!oldVersion) return newVersion;

  // we expect that a version will not change so the only difference should be the deployment
  // date
  if (oldVersion.deploymentDate != newVersion.deploymentDate) {
    return newVersion;
  }

  return oldVersion;
};

const mergeDeployment = (
  newDeployment: DeployedProcessInfo,
  oldDeployment?: DeployedProcessInfo,
) => {
  if (!oldDeployment) return newDeployment;

  let hasChanges = false;

  newDeployment.versions.forEach((newInfo, index) => {
    const oldInfo = oldDeployment.versions.find((v) => v.versionId === newInfo.versionId);
    const merged = mergeVersion(newInfo, oldInfo);
    if (merged !== oldInfo) hasChanges = true;
    newDeployment.versions[index] = merged;
  });

  if (newDeployment.versions.length !== oldDeployment.versions.length) hasChanges = true;

  newDeployment.instances.forEach((newInfo, index) => {
    const oldInfo = oldDeployment.instances.find(
      (v) => v.processInstanceId === newInfo.processInstanceId,
    );
    const merged = mergeInstance(newInfo, oldInfo);
    if (merged !== oldInfo) hasChanges = true;
    newDeployment.instances[index] = merged;
  });

  if (newDeployment.instances.length !== oldDeployment.instances.length) hasChanges = true;

  return hasChanges ? newDeployment : oldDeployment;
};

function useDeployment(definitionId: string, initialData?: DeployedProcessInfo) {
  const space = useEnvironment();

  const queryFn = useCallback(async () => {
    return await getDeployment(space.spaceId, definitionId);
  }, [space.spaceId, definitionId]);

  return useQuery({
    queryFn,
    initialData,
    queryKey: ['processDeployments', space.spaceId, definitionId],
    refetchInterval: 5000,
    // return the same data if nothing has changed from the last fetch to prevent unnecessary
    // rerenders
    structuralSharing: (oldQuery, newQuery) => {
      if (!oldQuery || !newQuery) return newQuery;

      const oldData = oldQuery as DeployedProcessInfo;
      const newData = newQuery as DeployedProcessInfo;

      return mergeDeployment(newData, oldData);
    },
  });
}

export default useDeployment;
