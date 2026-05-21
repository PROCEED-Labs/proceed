'use server';

import { asyncFilter, asyncMap } from '@/lib/helpers/javascriptHelpers';
import Ability from '@/lib/ability/abilityHelper';
import { UserFacingError, getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';

import { getAllAvailableEngines, getAvailableAdminEngines } from '@/lib/data/engines';

import { Engine, SpaceEngine } from '@/lib/engines/types';
import {
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  getDeployment as fetchDeployment,
  getProcessImageFromMachine,
  removeDeploymentFromMachines,
  changeDeploymentActivation as _changeDeploymentActivation,
  DeployedProcessInfo,
  getDeploymentActivation,
} from '../engines/deployment';

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
    // TODO: manage permissions for deploying a process

    let engines;
    if (_forceEngine === 'PROCEED') {
      // force that only proceed engines are supposed to be used
      engines = await getAvailableAdminEngines();

      if (isUserErrorResponse(engines)) return engines;
    } else {
      // get all available engines
      engines = await getAllAvailableEngines(spaceId);

      if (isUserErrorResponse(engines)) return engines;

      if (_forceEngine) {
        // force a specific engine if it is available
        engines = engines.filter((e) => e.id === _forceEngine.id);
        if (!engines.length) throw new Error("Engine couldn't be reached");
      }
    }

    if (!engines.length) throw new UserFacingError('No fitting engine found.');

    const processAlreadyDeployedInfo = await asyncMap(engines, async (engine) => {
      let deployment;
      try {
        deployment = await fetchDeployment(engine, definitionId);
        // ignore not found errors on engines that don't have a deployment of the process
      } catch (err) {
        deployment = undefined;
      }
      return [engine, deployment] as const;
    });

    function withDeployment(
      info: (typeof processAlreadyDeployedInfo)[number],
    ): info is readonly [Engine, DeployedProcessInfo] {
      return !!info[1];
    }
    const enginesWithDeployment = processAlreadyDeployedInfo.filter(withDeployment);

    // check if the version is already deployed to some engine since we don't
    // need to redeploy it in that case
    if (
      !_forceEngine &&
      enginesWithDeployment.some(([_, deployment]) =>
        deployment.versions.some((version) => version.versionId === versionId),
      )
    ) {
      return;
    }

    if (!_forceEngine && enginesWithDeployment.length) {
      // check if an engine already has another version in which case that engine is selected
      engines = enginesWithDeployment.map(([engine]) => engine);
    }

    const deployedTo = await _deployProcess(definitionId, versionId, spaceId, method, engines);

    // deactivate the process on all engines that have a deployment but which were not target of the
    // new deployment
    await Promise.allSettled(
      enginesWithDeployment.map(async ([engine]) => {
        if (!deployedTo.some((dE) => dE.id === engine.id)) {
          await _changeDeploymentActivation(engine, definitionId, undefined, false);
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
    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    const engines = await asyncFilter(availableEngines, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      return deployments.some((deployment) => deployment.definitionId === definitionId);
    });

    await removeDeploymentFromMachines(engines, definitionId);
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
    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    const engines = await asyncFilter(availableEngines, async (engine) => {
      const deployments = await fetchDeployments([engine]);
      return deployments.some(
        (deployment) =>
          deployment.definitionId === definitionId &&
          deployment.versions.some((v) => v.versionId === version),
      );
    });

    if (!engines.length) return false;

    return await getDeploymentActivation(engines[0], definitionId, version);
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
    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    const engines = await asyncFilter(availableEngines, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      return deployments.some(
        (deployment) =>
          deployment.definitionId === definitionId &&
          deployment.versions.some((v) => v.versionId === version),
      );
    });

    if (!engines.length)
      throw new Error('There is no available engine with the requested process version.');

    await _changeDeploymentActivation(engines[0], definitionId, version, value);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getProcessImage(spaceId: string, definitionId: string, fileName: string) {
  try {
    // find the engine the instance is running on
    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    let engines = await asyncFilter(availableEngines, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      // TODO: when we start to have assignments of processes to multiple machines we need to check
      // if the deployment on the machine actually contains the image
      return deployments.some((deployment) => deployment.definitionId === definitionId);
    });

    if (!engines.length) throw new Error('Failed to an engine the process was deployed to!');

    return await getProcessImageFromMachine(engines[0], definitionId, fileName);
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}
