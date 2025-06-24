import { useEnvironment } from '@/components/auth-can';
import {
  DeployedProcessInfo,
  InstanceInfo,
  VersionInfo,
  getDeploymentFromMachine,
} from '@/lib/engines/deployment';
import {
  getInstanceFromMachine,
  pauseInstanceOnMachine,
  resumeInstanceOnMachine,
  startInstanceOnMachine,
  stopInstanceOnMachine,
} from '@/lib/engines/instances';
import { Engine } from '@/lib/engines/machines';
import { getStartFormFromMachine } from '@/lib/engines/tasklist';
import useEngines from '@/lib/engines/use-engines';
import { asyncFilter, asyncForEach, deepEquals } from '@/lib/helpers/javascriptHelpers';
import { getErrorMessage, userError } from '@/lib/user-error';
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

  const { data: engines } = useEngines({
    key: [definitionId],
    fn: async (engine) => {
      const deployment = await getDeploymentFromMachine(definitionId, engine, 'definitionId');
      return !!deployment;
    },
  });

  const startInstance = async (versionId: string, variables: { [key: string]: any } = {}) => {
    if (engines?.length)
      // TODO: in case of static deployment or different versions on different engines we will have
      // to check if the engine can actually be used to start an instance
      return await startInstanceOnMachine(definitionId, versionId, engines[0], variables);
  };

  const activeStates = ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'];
  async function changeInstanceState(
    instanceId: string,
    stateValidator: (state: InstanceInfo['instanceState']) => boolean,
    stateChangeFunction: typeof resumeInstanceOnMachine,
  ) {
    if (!engines) return;
    try {
      const targetEngines = await asyncFilter(engines, async (engine: Engine) => {
        const instance = await getInstanceFromMachine(
          definitionId,
          instanceId,
          engine,
          'instanceState',
        );

        if (!instance) return false;

        return stateValidator(instance.instanceState);
      });

      await asyncForEach(targetEngines, async (engine) => {
        await stateChangeFunction(definitionId, instanceId, engine);
      });
    } catch (e) {
      const message = getErrorMessage(e);
      return userError(message);
    }
  }

  async function resumeInstance(instanceId: string) {
    // TODO: manage permissions for starting an instance
    return await changeInstanceState(
      instanceId,
      (tokenStates) => tokenStates.some((tokenState) => tokenState === 'PAUSED'),
      resumeInstanceOnMachine,
    );
  }

  async function pauseInstance(instanceId: string) {
    // TODO: manage permissions for starting an instance
    return await changeInstanceState(
      instanceId,
      (tokenStates) =>
        tokenStates.some((state) => activeStates.includes(state) && state !== 'PAUSED'),
      pauseInstanceOnMachine,
    );
  }

  async function stopInstance(instanceId: string) {
    // TODO: manage permissions for starting an instance
    return await changeInstanceState(
      instanceId,
      (tokenStates) => tokenStates.some((state) => activeStates.includes(state)),
      stopInstanceOnMachine,
    );
  }

  async function getStartForm(versionId: string) {
    if (!engines) return;
    try {
      // TODO: in case of static deployment or different versions on different engines we will have
      // to check if the engine can actually be used to start an instance
      return await getStartFormFromMachine(definitionId, versionId, engines[0]);
    } catch (e) {
      const message = getErrorMessage(e);
      return userError(message);
    }
  }

  const queryFn = useCallback(async () => {
    if (engines?.length) {
      // TODO: this only handles situations where we have only a single engine
      // in the future we have to implement logic that merges data from multiple engines
      const deployment = await getDeploymentFromMachine(definitionId, engines[0]);
      return deployment || null;
    }
    return null;
  }, [engines, definitionId]);

  const query = useQuery({
    queryFn,
    initialData,
    queryKey: ['processDeployments', space.spaceId, definitionId],
    refetchInterval: 1000,
    // return the same data if nothing has changed from the last fetch to prevent unnecessary
    // rerenders
    structuralSharing: (oldQuery, newQuery) => {
      if (newQuery === undefined) return oldQuery;
      if (!oldQuery && !newQuery) return newQuery;

      const oldData = oldQuery as DeployedProcessInfo;
      const newData = newQuery as DeployedProcessInfo;

      return mergeDeployment(newData, oldData);
    },
  });

  return { ...query, startInstance, resumeInstance, pauseInstance, stopInstance, getStartForm };
}

export default useDeployment;
