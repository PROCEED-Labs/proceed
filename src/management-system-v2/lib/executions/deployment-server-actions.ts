'use server';

import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import Ability from '@/lib/ability/abilityHelper';
import {
  UserErrorType,
  UserFacingError,
  getErrorMessage,
  isUserErrorResponse,
  userError,
} from '@/lib/user-error';

import { getAllAvailableEngines, getAvailableAdminEngines } from '@/lib/data/engines';

import { Engine, SpaceEngine } from '@/lib/engines/types';
import {
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  getProcessImageFromMachine,
  removeDeploymentFromMachines,
  changeDeploymentActivation as _changeDeploymentActivation,
  getDeploymentActivation,
} from '../engines/deployment';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { addDeployment, getProcessDeployments, updateDeployment } from '../data/deployment';

export async function getDeployment(spaceId: string, definitionId: string, ability?: Ability) {
  const engines = await getAllAvailableEngines(spaceId, ability);
  if (isUserErrorResponse(engines)) return engines;

  const deployments = await fetchDeployments(engines);

  return deployments.find((d) => d.definitionId === definitionId) || null;
}

export async function deployProcess(
  definitionId: string,
  versionId: string,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
  _forceEngine?: SpaceEngine | 'PROCEED',
) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);

    const { userId } = await getCurrentUser();

    let engines: Engine[];
    if (_forceEngine === 'PROCEED') {
      // force that only proceed engines are supposed to be used
      const res = await getAvailableAdminEngines();

      if (isUserErrorResponse(res)) return res;

      engines = res;
    } else {
      // get all available engines
      const res = await getAllAvailableEngines(spaceId);

      if (isUserErrorResponse(res)) return res;

      engines = res;

      if (_forceEngine) {
        // force a specific engine if it is available
        engines = engines.filter((e) => e.id === _forceEngine.id);
        if (!engines.length) throw new Error("Engine couldn't be reached");
      }
    }

    if (!engines.length) throw new UserFacingError('No fitting engine found.');

    const alreadyDeployed = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(alreadyDeployed)) return alreadyDeployed;

    const processAlreadyDeployedInfo = alreadyDeployed
      .map((deployment) => ({
        ...deployment,
        engine: (engines as Engine[]).find((e) => e.id === deployment.engineId)!,
      }))
      .filter((d) => !!d.engine);

    // check if the version is already deployed to some reachable engine since we don't
    // need to redeploy it in that case
    if (processAlreadyDeployedInfo.some((i) => i.versionId === versionId)) {
      return;
    }

    if (processAlreadyDeployedInfo.length) {
      // check if an engine already has another version in which case that engine is selected
      engines = processAlreadyDeployedInfo.map((i) => i.engine);
    }

    const deployedTo = await _deployProcess(definitionId, versionId, spaceId, method, engines);

    await addDeployment(spaceId, {
      versionId,
      deployerId: userId,
      deployTime: new Date(),
      engineIds: deployedTo.map((engine) => engine.id),
    });

    // deactivate the process on all engines that have a deployment but which were not target of the
    // new deployment
    await Promise.allSettled(
      processAlreadyDeployedInfo.map(async (deployment) => {
        // TODO: consider all engines to deactivate deployments on machines that are not "forced" here
        if (deployment.engine && !deployedTo.some((engine) => engine.id === deployment.engineId)) {
          await _changeDeploymentActivation(deployment.engine, definitionId, undefined, false);
        }
      }),
    );
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function removeDeployment(definitionId: string, spaceId: string) {
  try {
    const deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;

    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    await asyncForEach(deployments, async (deployment) => {
      try {
        const engine = availableEngines.find((aE) => aE.id === deployment.engineId);

        if (engine) {
          // TODO: we might have deployments of multiple versions of the same process to the same
          // engine => we don't need to call this for every version but only once per engine per
          // process
          await removeDeploymentFromMachines([engine], deployment.processId);
          await updateDeployment(spaceId, deployment.id, { removeTime: new Date() });
          return;
        }
      } catch (err) {}
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getProcessActivationStatus(
  definitionId: string,
  spaceId: string,
  version: string,
) {
  try {
    let deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;
    deployments = deployments.filter((deployment) => deployment.versionId === version);

    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;

    const res = await asyncMap(deployments, async (deployment) => {
      try {
        const engine = availableEngines.find((aE) => aE.id === deployment.engineId);

        if (engine) {
          return await getDeploymentActivation(engine, definitionId, version);
        }
      } catch (err) {}

      return false;
    });

    return res.some((isActive) => isActive);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function changeDeploymentActivation(
  definitionId: string,
  spaceId: string,
  version: string,
  value: boolean,
) {
  try {
    let deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;
    const versionDeployments = deployments.filter((deployment) => deployment.versionId === version);

    if (!deployments.length) return userError('This version is not deployed');

    let availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;

    availableEngines = availableEngines.filter((e) =>
      versionDeployments.some((d) => d.engineId === e.id),
    );

    if (!availableEngines.length)
      throw new Error('There is no available engine with the requested process version.');

    await _changeDeploymentActivation(availableEngines[0], definitionId, version, value);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getProcessImage(spaceId: string, definitionId: string, fileName: string) {
  try {
    let deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;

    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;

    for (const deployment of deployments) {
      const engine = availableEngines.find((e) => e.id === deployment.engineId);

      if (engine) {
        try {
          return await getProcessImageFromMachine(engine, definitionId, fileName);
        } catch (err) {}
      }
    }

    return userError('Failed to fetch the image from the engines the process is deployed to.');
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}
