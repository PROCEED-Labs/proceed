'use server';

import { getCurrentEnvironment } from '@/components/auth';
import {
  getDeployment as _getDeployment,
  getDeployments as _getDeployments,
  getProcessDeployments as _getProcessDeployments,
  addProcessDeployment as _addProcessDeployment,
  removeDeployments as _removeDeployments,
  updateProcessDeployment,
} from './db/deployment';
import { UserErrorType, userError } from '../user-error';
import { DeploymentInput, InstanceInput } from '../deployments-schema';
import {
  addProcessInstance,
  updateProcessInstance,
  removeProcessInstance,
  getProcessInstance,
} from './db/instances';

export async function getDeployment(spaceId: string, deploymentId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return _getDeployment(deploymentId);
}

export async function getDeployments(spaceId: string, skipAbilityCheck = false) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!skipAbilityCheck && !ability.can('view', 'Execution')) {
    return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  return _getDeployments(spaceId);
}

export async function getProcessDeployments(spaceId: string, processId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return _getProcessDeployments(processId);
}

export async function addDeployment(spaceId: string, input: DeploymentInput) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return _addProcessDeployment({ ...input });
}

export async function updateDeployment(
  spaceId: string,
  deploymentId: string,
  input: Partial<DeploymentInput>,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return updateProcessDeployment(deploymentId, input);
}

export async function removeDeployments(spaceId: string, deploymentIds: string[]) {
  const { ability } = await getCurrentEnvironment(spaceId);

  // TODO: handle the permission check on a per process/folder level
  if (!ability.can('delete', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  await _removeDeployments(deploymentIds);
}

export async function getInstance(spaceId: string, instanceId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return getProcessInstance(instanceId);
}

export async function addInstance(spaceId: string, instance: InstanceInput) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return addProcessInstance(instance);
}

export async function updateInstance(
  spaceId: string,
  instanceId: string,
  input: Partial<InstanceInput>,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return updateProcessInstance(instanceId, input);
}

export async function removeInstance(spaceId: string, instanceId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('delete', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  return removeProcessInstance(instanceId);
}
