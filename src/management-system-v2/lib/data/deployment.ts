'use server';

import { getCurrentEnvironment } from '@/components/auth';
import {
  getDeployedProcesses,
  getProcessDeployments as _getProcessDeployments,
  addProcessDeployment as _addProcessDeployment,
  updateProcessDeployment,
} from './db/deployment';
import { UserErrorType, isUserErrorResponse, userError } from '../user-error';
import { DeploymentInput, InstanceInput } from '../deployments-schema';
import { addProcessInstance, updateProcessInstance, getProcessInstance } from './db/instances';
import { AsyncArray, asyncMap } from '../helpers/javascriptHelpers';
import Ability from '../ability/abilityHelper';

export async function getDeployments(spaceId: string, skipAbilityCheck = false) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(spaceId);

  if (!skipAbilityCheck && !ability.can('view', 'Execution')) {
    return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const deployments = await AsyncArray.from(getDeployedProcesses(spaceId))
    .map((processId) => _getProcessDeployments(activeEnvironment.spaceId, processId))
    .flatten();

  if (!skipAbilityCheck) {
    // TODO: filter the deployments so the current user can only see the ones that they have access
    // to
  }

  return deployments;
}

export async function getProcessDeployments(spaceId: string, processId: string) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return _getProcessDeployments(activeEnvironment.spaceId, processId);
}

export async function addDeployment(spaceId: string, processId: string, input: DeploymentInput) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(spaceId);

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return _addProcessDeployment(activeEnvironment.spaceId, processId, { ...input });
}

export async function updateDeployment(
  spaceId: string,
  processId: string,
  deploymentId: string,
  input: Partial<DeploymentInput>,
  ability?: Ability,
  skipAbilityCheck = false,
) {
  if (!skipAbilityCheck) {
    if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  return updateProcessDeployment(processId, deploymentId, input);
}

export async function getInstance(spaceId: string, instanceId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return getProcessInstance(instanceId);
}

export async function getProcessInstances(
  spaceId: string,
  processId: string,
  allowDeletedDeployments = false,
) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const deployments = await getProcessDeployments(activeEnvironment.spaceId, processId);
  if (isUserErrorResponse(deployments)) return null;

  const availableDeployments = deployments.filter((d) => allowDeletedDeployments || !d.deleted);

  return AsyncArray.from(availableDeployments)
    .map(async (d) => {
      type InstanceRes = Awaited<ReturnType<typeof getInstance>>;
      function isNotAnError(
        instanceRes: InstanceRes,
      ): instanceRes is Exclude<NonNullable<InstanceRes>, { error: any }> {
        return !!instanceRes && !('error' in instanceRes);
      }

      return (await asyncMap(d.instances, async (iId) => await getProcessInstance(iId))).filter(
        isNotAnError,
      );
    })
    .flatten();
}

export async function addInstance(
  spaceId: string,
  instance: InstanceInput,
  skipAbilityCheck = false,
) {
  if (!skipAbilityCheck) {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  return addProcessInstance(instance);
}

export async function updateInstance(
  spaceId: string,
  instanceId: string,
  input: Partial<InstanceInput>,
  skipAbilityCheck = false,
) {
  if (!skipAbilityCheck) {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  return updateProcessInstance(instanceId, input);
}
