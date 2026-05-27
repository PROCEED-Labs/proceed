'use server';

import db from '@/lib/data/db';

import { asyncFilter, asyncForEach, asyncMap, deepEquals } from '@/lib/helpers/javascriptHelpers';
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
  InstanceInfo,
} from '../engines/deployment';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { addDeployment, getProcessDeployments, updateDeployment } from '../data/deployment';
import { savedEnginesToEngines } from '../engines/saved-engines-helpers';
import { getMSConfig } from '../ms-config/ms-config';

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
        // TODO: consider all engines to deactivate deployments on engines that are not "forced" here
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

      // if removing the deployment is currently not possible mark it for automatic removal
      await updateDeployment(spaceId, deployment.id, { toRemove: true });
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

// all connected users are sharing this information
const global = globalThis as any;
// flag that indicates if an update triggered by another user is currently running
global.isRefetchingDeployments =
  global.isRefetchingDeployments || (global.isRefetchingDeployments = false);
global.deploymentRefetchDonePromise =
  global.deploymentRefetchDonePromise || (global.deploymentRefetchDonePromise = Promise.resolve());
// value that indicates the time the last update finished to ensure that we have 10 seconds timeout
// between updates
global.lastDeploymentsRefetchTime =
  global.lastDeploymentsRefetchTime || (global.lastDeploymentsRefetchTime = 0);

/**
 * Fetches the deployments information from all engine that are expected to have a deployed process
 * from this MS
 **/
export async function refetchDeployments() {
  const config = await getMSConfig();

  const interval = config.PROCEED_PUBLIC_DEPLOYMENT_REFETCHING_INTERVAL;
  if (
    // if automation is not activated we don't want to do anything here
    config.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE &&
    // if the interval variable is set to 0 we consider this to mean that fetching is deactivated
    interval &&
    // the user sets the interval in seconds so we have to convert to milliseconds
    Date.now() - global.lastDeploymentsRefetchTime >= interval * 1000 &&
    // allow only one refetch for all users in the configured interval
    !global.isRefetchingDeployments
  ) {
    // prevent other users from triggering concurrent refetching
    global.isRefetchingDeployments = true;
    global.deploymentRefetchDonePromise = new Promise(async (resolve) => {
      try {
        // get all (non-removed) deployments known to the MS
        const res = await db.processDeployment.findMany({
          where: { removeTime: null },
          select: {
            id: true,
            engineId: true,
            toRemove: true,
            version: {
              select: { id: true, processId: true, process: { select: { environmentId: true } } },
            },
            instances: true,
          },
        });

        // get unique ids of all known engines that have a deployment from this MS with information
        // about what we expect to be deployed on those engines
        const engineIdsWithDeployments = res.reduce(
          (acc, curr) => {
            if (!acc[curr.engineId]) acc[curr.engineId] = {};
            const engineDeploymentMap = acc[curr.engineId];
            if (!engineDeploymentMap[curr.version.processId]) {
              engineDeploymentMap[curr.version.processId] = {};
            }
            const processMap = engineDeploymentMap[curr.version.processId];
            processMap[curr.version.id] = curr;

            return acc;
          },
          {} as {
            [engineId: string]: {
              [definitionId: string]: { [versionId: string]: (typeof res)[number] };
            };
          },
        );

        // get all (reachable) engines known to the MS
        const dbEngines = await db.engine.findMany();
        let engines = await savedEnginesToEngines(dbEngines);
        const knownEngines: Record<string, Engine> = {};
        // deduplicate the engines (an engine might be reachable through multiple "dbEngines")
        engines = engines.filter((engine) => {
          if (knownEngines[engine.id]) return false;
          knownEngines[engine.id] = engine;
          return true;
        });

        // create a list of all engines we need to fetch new information from
        const reachableWithDeployments = engines.filter((e) => !!engineIdsWithDeployments[e.id]);

        const newInstances: {
          id: string;
          deploymentId: string;
          initiatorId: null;
          engineIds: string[];
          state: InstanceInfo;
        }[] = [];
        const instanceUpdates: { id: string; state: InstanceInfo }[] = [];

        // fetch deployment data from the engines
        const engineDeployments = Object.fromEntries(
          await asyncMap(reachableWithDeployments, async (e) => {
            const res = await fetchDeployments([e]);

            const deployedProcesses = Object.fromEntries(
              res.map((p) => [
                p.definitionId,
                {
                  versions: Object.fromEntries(p.versions.map((v) => [v.versionId, v])),
                },
              ]),
            );

            // TODO: when we want to handle instances that move to other engines automatically, we
            // will have to change this logic since it assumes that all available data of the instance
            // can be found on the engine it was started on
            res.forEach((p) => {
              p.instances.forEach((i) => {
                const deployment =
                  engineIdsWithDeployments[e.id]?.[p.definitionId]?.[i.processVersion];
                if (!deployment) return;
                const existingInstance = deployment.instances.find(
                  (dI) => dI.id === i.processInstanceId,
                );
                if (!existingInstance) {
                  newInstances.push({
                    id: i.processInstanceId,
                    deploymentId: deployment.id,
                    initiatorId: null,
                    engineIds: [e.id],
                    state: i,
                  });
                } else if (!deepEquals(i, existingInstance.state)) {
                  instanceUpdates.push({ id: i.processInstanceId, state: i });
                }
              });
            });

            return [e.id, deployedProcesses];
          }),
        );

        const removedOnEngine = await asyncFilter(res, async (d) => {
          // we say the deployment still exists on the engine if the engine cannot be reached to check
          if (!engineDeployments[d.engineId]) return false;

          if (d.toRemove) {
            // remove the deployment from the engine if it is marked for automatic removal
            try {
              await removeDeploymentFromMachines([knownEngines[d.engineId]], d.version.processId);
              return true;
            } catch (err) {}
            return false;
          } else {
            // check if deployment information has been unexpectedly lost on the engine
            return !engineDeployments[d.engineId][d.version.processId]?.versions[d.version.id];
          }
        });

        // update the deployment information in the db
        await db.$transaction(async (tx) => {
          await Promise.all([
            ...removedOnEngine.map(async (deployment) => {
              await tx.processDeployment.update({
                where: { id: deployment.id },
                data: { removeTime: new Date(), toRemove: false },
              });
            }),
            ...instanceUpdates.map(async ({ id, state }) => {
              await tx.processInstance.update({
                where: { id },
                data: { state },
              });
            }),
            newInstances.length && tx.processInstance.createMany({ data: newInstances }),
          ]);
        });
      } catch (err) {
        console.error('Error fetching deployment information: ', err);
      }

      // allow the next update to happen after the configured interval has elapsed
      global.isRefetchingDeployments = false;
      global.lastDeploymentsRefetchTime = Date.now();
      resolve(undefined);
    });
  }

  // allows the calling function to wait until the already running refetch cycle is finished
  return global.deploymentRefetchDonePromise;
}
