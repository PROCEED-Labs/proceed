'use server';

import db from '@/lib/data/db';

import {
  asyncFilter,
  asyncForEach,
  asyncMap,
  deepEquals,
  pick,
} from '@/lib/helpers/javascriptHelpers';
import {
  UserErrorType,
  UserFacingError,
  getErrorMessage,
  isUserErrorResponse,
  permissionDenied,
  userError,
} from '@/lib/user-error';

import { getAllAvailableEngines, getAvailableAdminEngines } from '@/lib/data/engines';
import { getProcessImage as getStoredProcessImage } from '../data/processes';

import { Engine, SpaceEngine } from '@/lib/engines/types';
import {
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  getProcessImageFromMachine,
  removeDeploymentFromMachines,
  changeDeploymentActivation as _changeDeploymentActivation,
  InstanceInfo,
} from '../engines/deployment';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { addDeployment, getProcessDeployments, updateDeployment } from '../data/deployment';
import { getMSConfig } from '../ms-config/ms-config';
import { updateTaskInfo } from '../tasks/server-actions';
import { engineRequest } from '../engines/endpoints';
import { getSharedRefetch } from '../shared-refetch';
import Ability from '../ability/abilityHelper';
import { EngineConnection } from '@prisma/client';

export async function deployProcess(
  definitionId: string,
  versionId: string,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
  _forceEngine?: SpaceEngine | 'PROCEED',
  ability?: Ability,
  userId?: string,
) {
  try {
    if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);

    if (!userId) ({ userId } = await getCurrentUser());

    const allEngines = await getAllAvailableEngines(spaceId, ability);

    if (isUserErrorResponse(allEngines)) return allEngines;

    let engines: Engine[];
    if (_forceEngine === 'PROCEED') {
      // force that only proceed engines are supposed to be used
      const res = await getAvailableAdminEngines();

      if (isUserErrorResponse(res)) return res;

      engines = res;
    } else {
      engines = allEngines;

      if (_forceEngine) {
        // force a specific engine if it is available
        engines = engines.filter((e) => e.id === _forceEngine.id);
        if (!engines.length) throw new Error("Engine couldn't be reached");
      }
    }

    if (!engines.length) throw new UserFacingError('No fitting engine found.');

    const alreadyDeployed = await getProcessDeployments(spaceId, definitionId, ability);
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

    const deployedTo = await _deployProcess(
      definitionId,
      versionId,
      spaceId,
      method,
      engines,
      ability,
    );

    await addDeployment(
      spaceId,
      {
        versionId,
        deployerId: userId,
        deployTime: new Date(),
        engineIds: deployedTo.map((engine) => engine.id),
        active: true,
      },
      ability,
    );

    // deactivate the process on all engines that have a deployment but which were not target of the
    // new deployment
    await Promise.allSettled(
      alreadyDeployed.map(async (deployment) => {
        if (deployment.active && !deployedTo.some((e) => e.id === deployment.engineId)) {
          await updateDeployment(spaceId, deployment.id, { active: false }, ability);

          const engine = allEngines.find((e) => e.id === deployment.engineId);
          if (engine) {
            await _changeDeploymentActivation(engine, definitionId, undefined, false);
          }
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
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('manage', 'Execution')) {
      return permissionDenied();
    }

    const deployments = await getProcessDeployments(spaceId, definitionId, undefined, true);
    if (isUserErrorResponse(deployments)) return deployments;

    await asyncForEach(deployments, async (deployment) => {
      try {
        const { engine } = deployment;

        if (engine.connections.some((c) => c.reachable)) {
          // TODO: we might have deployments of multiple versions of the same process to the same
          // engine => we don't need to call this for every version but only once per engine per
          // process
          await removeDeploymentFromMachines([engine], deployment.processId);
          await updateDeployment(spaceId, deployment.id, { removeTime: new Date(), active: false });
          return;
        }
      } catch (err) {}

      // if removing the deployment is currently not possible mark it for automatic removal
      await updateDeployment(spaceId, deployment.id, { toRemove: true, active: false });
    });
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
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('manage', 'Execution')) {
      return permissionDenied();
    }

    let deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;

    const versionDeployments = deployments.filter((deployment) => deployment.versionId === version);
    if (!versionDeployments.length) return userError('This version is not deployed');

    // exit early if executing the function will/should not change the already existing activation state
    if (
      (value === true && versionDeployments.some((d) => d.active === true)) ||
      (value === false && versionDeployments.every((d) => d.active === false))
    ) {
      return;
    }

    let deploymentsToChange = versionDeployments.filter((d) => d.active !== value);

    if (value === true) {
      let activated = false;
      for (const deployment of deploymentsToChange) {
        const { engine } = deployment;
        if (engine.connections.some((c) => c.reachable)) {
          try {
            // activate the process on a single machine so we do not spawn new instances on multiple machines at once
            await _changeDeploymentActivation(engine, definitionId, version, true);
            await updateDeployment(spaceId, deployment.id, { active: true });
            activated = true;
            break;
          } catch (err) {}
        }
      }

      if (!activated) return userError('Could not reach any engine to activate the deployment.');

      // if we activate a deployment we need to deactivate all deployments of other versions that are currently
      // active
      deploymentsToChange = deployments.filter((d) => d.versionId !== version && d.active);
    }

    const res = await asyncMap(deploymentsToChange, async (d) => {
      // mark the deployment as inactive locally
      await updateDeployment(spaceId, d.id, { active: false });

      try {
        // if deactivating the deployment fails the refetch loop should deactivate it due to the
        // mismatch between the locally stored activation value and the activation value from the
        // engine
        const { engine } = d;
        if (engine && engine.connections.some((c) => c.reachable)) {
          await _changeDeploymentActivation(engine, definitionId, version, false);
          return true;
        }
      } catch (err) {}
      return false;
    });

    if (res.some((success) => !success)) {
      return userError(
        `Some deployments of${value ? ' other versions of' : ''} this process could not be deactivated. The system will try to deactivate them as soon as possible but they might spawn new instances in the meantime.`,
      );
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getProcessImage(spaceId: string, definitionId: string, fileName: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('view', 'Execution')) {
      return permissionDenied();
    }

    const image = await getStoredProcessImage(definitionId, fileName, spaceId);

    if (!isUserErrorResponse(image)) {
      return new Blob([image]);
    }

    let deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;

    for (const deployment of deployments) {
      const { engine } = deployment;

      if (engine.connections.some((c) => c.reachable)) {
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

async function refetchFn() {
  try {
    // get all (non-removed) deployments known to the MS
    const storedDeployments = await db.processDeployment.findMany({
      select: {
        id: true,
        // include information about engines the processes were deployed to
        engine: {
          select: {
            id: true,
            connections: {
              // we only want currently reachable connections
              where: {
                reachable: true,
              },
              select: { reachable: true, connection: true },
            },
          },
        },
        toRemove: true,
        removeTime: true,
        active: true,
        version: {
          select: { id: true, processId: true, process: { select: { environmentId: true } } },
        },
        instances: true,
      },
    });

    type InstanceData = {
      id: string;
      processId: string;
      environmentId: string;
      versionId: string;
      state: InstanceInfo;
      logs: any[];
    };
    const storedInstances: { [instanceId: string]: InstanceData } = {};
    const deployments: { [engineProcessAndVersionId: string]: (typeof storedDeployments)[number] } =
      {};
    const enginesWithDeployments: {
      [engineId: string]: {
        id: string;
        connections: { reachable: boolean; connection: EngineConnection }[];
      };
    } = {};

    storedDeployments.forEach((d) => {
      deployments[`${d.engine.id}|${d.version.processId}|${d.version.id}`] = d;
      // only consider engines that are actually have deployments that were not already removed
      if (!d.removeTime) enginesWithDeployments[d.engine.id] = d.engine;
      d.instances.forEach((i) => {
        storedInstances[i.id] = {
          ...i,
          state: i.state as InstanceInfo,
          processId: d.version.processId,
          versionId: d.version.id,
          environmentId: d.version.process.environmentId,
          logs: i.logs as any[],
        };
      });
    });

    // create a list of all engines we can and need to fetch new information from
    const reachableWithDeployments = Object.values(enginesWithDeployments).filter((e) =>
      e.connections.some((c) => c.reachable),
    );

    const newInstances: (InstanceData & {
      deploymentId: string;
      initiatorId: null;
      engineIds: string[];
    })[] = [];
    const instanceUpdates: InstanceData[] = [];
    const unchangedInstances: InstanceData[] = [];

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

        await asyncForEach(res, async (p) => {
          await asyncForEach(p.versions, async (v) => {
            try {
              const deployment = deployments[`${e.id}|${p.definitionId}|${v.versionId}`];
              if (!deployment) return;

              if (v.active !== deployment.active) {
                // mismatch of the active state on the engine and the locally stored active
                // state => change the state on the engine
                await _changeDeploymentActivation(
                  e,
                  p.definitionId,
                  v.versionId,
                  deployment.active,
                );
              }
            } catch (err) {
              console.error(
                `Failed to update the active state for the deployment of process (id: ${p.definitionId}) version (id: ${v.versionId}) on engine (id: ${e.id}).`,
              );
            }
          });
        });

        // TODO: when we want to handle instances that move to other engines automatically, we
        // will have to change this logic since it assumes that all available data of the instance
        // can be found on the engine it was started on
        await asyncForEach(res, async (p) => {
          await asyncForEach(p.instances, async (i) => {
            const deployment = deployments[`${e.id}|${i.processId}|${i.processVersion}`];
            if (!deployment) return;
            const existingInstance = storedInstances[i.processInstanceId];

            const logs = await engineRequest({
              engine: e,
              method: 'get',
              endpoint: '/logging/process/:definitionId/instance/:instanceId',
              pathParams: { definitionId: p.definitionId, instanceId: i.processInstanceId },
            });

            if (!existingInstance) {
              newInstances.push({
                id: i.processInstanceId,
                processId: p.definitionId,
                environmentId: deployment.version.process.environmentId,
                versionId: i.processVersion,
                deploymentId: deployment.id,
                initiatorId: null,
                engineIds: [e.id],
                state: i,
                logs,
              });
            } else if (
              !deepEquals(i, existingInstance.state) ||
              !deepEquals(logs, existingInstance.logs)
            ) {
              instanceUpdates.push({
                id: i.processInstanceId,
                processId: p.definitionId,
                environmentId: deployment.version.process.environmentId,
                versionId: deployment.version.id,
                state: i,
                logs,
              });
            } else {
              unchangedInstances.push(existingInstance);
            }
          });
        });

        return [e.id, deployedProcesses];
      }),
    );

    const removedOnEngine = await asyncFilter(storedDeployments, async (d) => {
      // we say the deployment still exists on the engine if the engine cannot be reached to check
      if (!engineDeployments[d.engine.id]) return false;

      if (d.toRemove) {
        // remove the deployment from the engine if it is marked for automatic removal
        try {
          await removeDeploymentFromMachines([d.engine], d.version.processId);
          return true;
        } catch (err) {}
        return false;
      } else {
        // check if deployment information has been unexpectedly lost on the engine
        return !engineDeployments[d.engine.id][d.version.processId]?.versions[d.version.id];
      }
    });

    // update the deployment information in the db
    await db.$transaction(async (tx) => {
      await Promise.all([
        ...removedOnEngine.map(async (deployment) => {
          await tx.processDeployment.update({
            where: { id: deployment.id },
            data: { removeTime: new Date(), toRemove: false, active: false },
          });
        }),
        ...instanceUpdates.map(async ({ id, state, logs }) => {
          await tx.processInstance.update({
            where: { id },
            data: { state, logs },
          });
        }),
        ...newInstances.map((i) =>
          tx.processInstance.create({
            data: {
              ...pick(i, ['id', 'deploymentId', 'initiatorId', 'state', 'logs']),
              engines: {
                connect: i.engineIds.map((id) => ({ id })),
              },
            },
          }),
        ),
      ]);
    });

    const knownInstances = Object.fromEntries(
      Object.values(storedInstances)
        .concat(instanceUpdates)
        .concat(newInstances)
        .map((i) => [i.id, { ...i, instanceId: i.id }]),
    );

    await updateTaskInfo(reachableWithDeployments, knownInstances);
  } catch (err) {
    console.error('Error fetching deployment information: ', err);
  }
}

export const refetchDeployments = getSharedRefetch({
  resource: 'Deployments',
  refetchFn,
  getTimeoutLength: async () => {
    const config = await getMSConfig();

    if (!config.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return 0;

    // the user sets the interval in seconds so we have to convert to milliseconds
    return config.PROCEED_PUBLIC_DEPLOYMENT_REFETCHING_INTERVAL * 1000;
  },
});
