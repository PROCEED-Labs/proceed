import { useEnvironment, useSession } from '@/components/auth-can';
import { StoredDeployment } from '@/lib/data/db/deployment';
import { addInstance, getInstance, getProcessDeployments } from '@/lib/data/deployment';
import { getProcessBPMN, getProcessHtmlFormHTML } from '@/lib/data/processes';
import { DeployedProcessInfo, InstanceInfo, getDeployment } from '@/lib/engines/deployment';
import {
  pauseInstanceOnMachine,
  resumeInstanceOnMachine,
  startInstanceOnMachine,
  stopInstanceOnMachine,
} from '@/lib/engines/instances';
import { Engine } from '@/lib/engines/machines';
import { deployProcess } from '@/lib/engines/server-actions';
import { getStartFormFromMachine } from '@/lib/engines/tasklist';
import useEngines from '@/lib/engines/use-engines';
import { AsyncArray } from '@/lib/helpers/javascriptHelpers';
import { truthyFilter } from '@/lib/typescript-utils';
import { getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';
import { getStartFormFileNameMapping } from '@proceed/bpmn-helper';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export type DeploymentInfo = {
  definitionId: string;
  versions: (DeployedProcessInfo['versions'][number] & { machines: string[] })[];
  instances: DeployedProcessInfo['instances'];
};

function useDeployment(definitionId: string, initialDeployments: StoredDeployment[]) {
  const space = useEnvironment();
  const { data: session } = useSession();

  const { data: engines, refetch: refetchEngines } = useEngines(space);

  const queryFn = useCallback(async () => {
    const deployments = await getProcessDeployments(space.spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return null;

    return deployments.filter((d) => !d.deleted) || null;
  }, [space, definitionId]);

  const deploymentsQuery = useQuery({
    queryFn,
    queryKey: ['processDeployments', space.spaceId, definitionId],
    initialData: initialDeployments,
    refetchInterval: 1000,
  });

  const instanceQueryFn = useCallback(async () => {
    if (!deploymentsQuery.data) return [];

    type InstanceRes = Awaited<ReturnType<typeof getInstance>>;
    function isNotAnError(
      instanceRes: InstanceRes,
    ): instanceRes is Exclude<NonNullable<InstanceRes>, { error: any }> {
      return !!instanceRes && !('error' in instanceRes);
    }

    return (
      await AsyncArray.from(deploymentsQuery.data)
        .map((d) => d.instances)
        .flatten()
        .map((iId) => getInstance(space.spaceId, iId))
    ).filter(isNotAnError);
  }, [space, deploymentsQuery.data]);

  const instancesQuery = useQuery({
    queryKey: ['processDeployments', space.spaceId, definitionId, 'instances'],
    initialData: [],
    queryFn: instanceQueryFn,
    enabled: !!deploymentsQuery.data,
    refetchInterval: 1000,
  });

  const startInstance = async (versionId: string, variables: { [key: string]: any } = {}) => {
    // make sure that the version is deployed on one of the currently reachable engines
    const updatedEngines = await refetchEngines();
    if (updatedEngines.error || !updatedEngines.data?.length) {
      return userError('Unable to find an engine to start the instance on.');
    }

    await deployProcess(definitionId, versionId, space.spaceId, 'dynamic', updatedEngines.data);

    const updated = await deploymentsQuery.refetch();
    if (updated.error) {
      return userError('Unable to get up to date deployment info.');
    }

    const versionDeployments = updated.data?.filter((d) => d.version.id === versionId);
    if (!versionDeployments?.length) return userError('This process version is not deployed.');

    const targetDeployment = versionDeployments
      .flatMap((v) => {
        const machineIds = v.machineIds
          .map((id) => updatedEngines.data?.find((e) => e.id === id))
          .filter(truthyFilter);

        return machineIds.length ? { deploymentId: v.id, machineIds } : undefined;
      })
      .filter(truthyFilter);

    // Deploy the version if no available engine has it deployed
    if (!targetDeployment.length) {
      return userError('None of the engines that this version is deployed to are reachable.');
    }

    if (targetDeployment.length) {
      const result = await startInstanceOnMachine(
        definitionId,
        versionId,
        targetDeployment[0].machineIds[0],
        variables,
        {
          processInitiator: session?.user.id,
          spaceIdOfProcessInitiator: space.spaceId,
        },
      );

      if (isUserErrorResponse(result)) return result;

      const engineDeploymentInfo = await getDeployment(
        targetDeployment[0].machineIds[0],
        definitionId,
      );
      const instance = engineDeploymentInfo.instances.find((i) => i.processInstanceId === result);

      if (!instance) return userError('Failed to fetch the newly created instance');

      await addInstance(space.spaceId, {
        id: result,
        versionId,
        deploymentId: targetDeployment[0].deploymentId,
        machineIds: [targetDeployment[0].machineIds[0].id],
        initiatorId: session!.user.id,
        state: instance,
      });

      return result;
    }
  };

  const deployedTo = useMemo(() => {
    const machineIds = deploymentsQuery.data?.flatMap((v) => v.machineIds) || [];
    return engines?.filter((engine) => machineIds.includes(engine.id));
  }, [deploymentsQuery.data, engines]);

  const activeStates = ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'];
  async function changeInstanceState(
    instanceId: string,
    stateValidator: (state: InstanceInfo['instanceState']) => boolean,
    stateChangeFunction: typeof resumeInstanceOnMachine,
  ) {
    if (!deployedTo) return;
    try {
      await AsyncArray.from(deployedTo)
        .filter(async (engine: Engine) => {
          try {
            const deployment = await getDeployment(engine, definitionId);

            const instance = deployment.instances.find(
              (instance) => instance.processInstanceId === instanceId,
            );

            if (!instance) return false;

            return stateValidator(instance.instanceState);
          } catch (err) {
            return false;
          }
        })
        .forEach(async (engine) => {
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
    try {
      // try to get the start form locally
      try {
        const bpmn = await getProcessBPMN(definitionId, space.spaceId, versionId);
        const [startForm] = Object.values(await getStartFormFileNameMapping(bpmn)).filter(
          truthyFilter,
        );
        if (!startForm) return '';

        return getProcessHtmlFormHTML(definitionId, startForm, space.spaceId);
      } catch (err) {}

      if (!deployedTo) return;

      // TODO: in case of static deployment or different versions on different engines we will have
      // to check if the engine can actually be used to start an instance
      return await getStartFormFromMachine(definitionId, versionId, deployedTo[0]);
    } catch (e) {
      const message = getErrorMessage(e);
      return userError(message);
    }
  }

  return {
    deployments: deploymentsQuery.data,
    refetchDeployments: deploymentsQuery.refetch,
    instances: instancesQuery.data,
    refetchInstances: instancesQuery.refetch,
    startInstance,
    resumeInstance,
    pauseInstance,
    stopInstance,
    getStartForm,
  };
}

export default useDeployment;
