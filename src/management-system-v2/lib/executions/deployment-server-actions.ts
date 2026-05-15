'use server';

import {
  UserErrorType,
  UserFacingError,
  getErrorMessage,
  isUserErrorResponse,
  userError,
} from '../user-error';
import {
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  removeDeploymentFromMachines,
  changeDeploymentActivation as _changeDeploymentActivation,
  VersionInfo,
  InstanceInfo,
} from '../engines/deployment';
import { Engine } from '../engines/machines';
import { savedEnginesToEngines } from '../engines/saved-engines-helpers';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getAvailableAdminMachines, getAllAvailableMachines } from '@/lib/data/engines';
import { asyncFilter, asyncMap, asyncForEach, AsyncArray } from '../helpers/javascriptHelpers';

import db from '@/lib/data/db';

import { MapNestedType, Prettify, truthyFilter } from '../typescript-utils';

import { addDeployment, updateDeployment, getProcessDeployments } from '../data/deployment';
import { revalidateTag } from 'next/cache';
import { updateTaskInfo } from '../tasks/server-actions';
import { reach } from 'yup';

export async function deployProcess(
  definitionId: string,
  versionId: string,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
  _forceEngine?: Engine | 'PROCEED',
) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);

    // TODO: manage permissions for deploying a process
    const { userId } = await getCurrentUser();

    let engines: Engine[];
    if (_forceEngine === 'PROCEED') {
      // force that only proceed engines are supposed to be used
      engines = await getAvailableAdminMachines(true);
    } else {
      // get all available engines
      engines = await getAllAvailableMachines(spaceId);

      if (_forceEngine) {
        // force a specific engine if it is available
        engines = engines.filter((e) => e.id === _forceEngine.id);
        if (!engines.length) throw new Error("Engine couldn't be reached");
      }
    }

    if (!engines.length) throw new UserFacingError('No fitting engine found.');

    const alreadyDeployed = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(alreadyDeployed)) return alreadyDeployed;

    // find all currently available deployments
    const processAlreadyDeployedInfo = alreadyDeployed
      .filter((d) => !d.deleted)
      .map((deployment) => ({
        ...deployment,
        machines: deployment.machineIds
          .map((id) => engines.find((e) => e.id === id))
          .filter(truthyFilter),
      }))
      .filter((d) => !!d.machines.length);

    // check if the version is already deployed to some reachable engine since we don't
    // need to redeploy it in that case
    if (processAlreadyDeployedInfo.some((i) => i.versionId === versionId)) {
      return;
    }

    if (processAlreadyDeployedInfo.length) {
      // check if an engine already has another version in which case that engine is selected
      engines = processAlreadyDeployedInfo.flatMap((i) => i.machines);
    }

    const deployedTo = await _deployProcess(definitionId, versionId, spaceId, method, engines);

    await addDeployment(spaceId, definitionId, {
      versionId,
      machineIds: deployedTo.map((engine) => engine.id),
      deployerId: userId,
      deployTime: new Date(),
      active: true,
    });

    // deactivate the process on all engines that have a deployment but which were not target of the
    // new deployment
    await AsyncArray.from(processAlreadyDeployedInfo)
      .filter((d) => d.active)
      .forEach(async (d) => {
        // set all currently active deployments to inactive (locally)
        await updateDeployment(spaceId, definitionId, d.id, { active: false });
      })
      .map((d) => d.machines)
      .flatten()
      .deduplicate((m) => m.id)
      .filter((m) => !deployedTo.some((dE) => dE.id === m.id))
      // send a deactivation request to every machine that has a previous deployment of the process
      .forEach(async (m) => {
        try {
          await _changeDeploymentActivation(m, definitionId, undefined, false);
        } catch (err) {}
      });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function removeDeployment(definitionId: string, spaceId: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('manage', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);

    const deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;

    const engines = await getAllAvailableMachines(spaceId);

    await asyncForEach(deployments, async (deployment) => {
      const stillDeployedOn = await asyncMap(deployment.machineIds, async (machineId) => {
        try {
          // check if the engine is currently reachable if not we have to remove the deployment at
          // a future time when it becomes reachable again
          const machine = engines.find((engine) => engine.id === machineId);
          if (!machine) return machineId;

          // remove the deployment from the engine
          await removeDeploymentFromMachines([machine], deployment.processId);
        } catch (err) {
          // could not remove the deployment so we keep the machine to remove the deployment later
          return machineId;
        }
      }).nonNullable();

      await updateDeployment(spaceId, deployment.processId, deployment.id, {
        deleted: true,
        active: false,
        machineIds: stillDeployedOn,
      });
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
    const engines = await getAllAvailableMachines(spaceId);
    const deployments = await getProcessDeployments(spaceId, definitionId);

    if (isUserErrorResponse(deployments)) return deployments;

    const versionDeployments = deployments.filter((d) => d.versionId === version);
    if (!versionDeployments.length) return userError('This version is not deployed.');

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
        for (const machineId of deployment.machineIds) {
          const machine = engines.find((e) => e.id === machineId);
          if (machine) {
            try {
              // activate the process on a single machine so we do not spawn new instances on multiple machines at once
              await _changeDeploymentActivation(machine, definitionId, version, true);
              await updateDeployment(spaceId, definitionId, deployment.id, { active: true });
              activated = true;
              break;
            } catch (err) {}
          }
        }
        if (activated) break;
      }

      if (!activated) return userError('Could not reach any engine to activate the deployment.');

      // if we activate a deployment we need to deactivate all deployments of other versions that are currently
      // active
      deploymentsToChange = deployments.filter((d) => d.versionId !== version && d.active);
    }

    await asyncForEach(deploymentsToChange, async (d) => {
      await updateDeployment(spaceId, definitionId, d.id, { active: false });

      await asyncForEach(d.machineIds, async (machineId) => {
        try {
          const machine = engines.find((e) => e.id === machineId);
          if (machine) await _changeDeploymentActivation(machine, definitionId, version, false);
        } catch (err) {}
      });
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

// all connected users are sharing this information
const global = globalThis as any;
// flag that indicates if an update triggered by another user is currently running
global.isRefetchingDeployments =
  global.isRefetchingDeployments || (global.isRefetchingDeployments = false);
// value that indicates the time the last update finished to ensure that we have 10 seconds timeout
// between updates
global.lastDeploymentsRefetchTime =
  global.lastDeploymentsRefetchTime || (global.lastDeploymentsRefetchTime = 0);

/**
 * Fetches the deployments information from all engine that are expected to have a deployed process
 * from this MS
 **/
export async function refetchDeployments() {
  // allow only one refetch for all users every 10 seconds
  if (global.isRefetchingDeployments || Date.now() - global.lastDeploymentsRefetchTime < 10000) {
    return;
  }
  // prevent other users from triggering additional updates
  global.isRefetchingDeployments = true;

  try {
    console.log(`\n\n\nRefetching Deployments: (${new Date().toLocaleTimeString()})\n\n\n`);

    // get all deployments known to the MS
    const res = await db.processDeployment.findMany({
      select: {
        id: true,
        deleted: true,
        active: true,
        machineIds: true,
        version: {
          select: { id: true, processId: true, process: { select: { environmentId: true } } },
        },
        instances: true,
      },
    });

    const allKnownDeployments = res as Prettify<
      MapNestedType<typeof res, 'instances/state', InstanceInfo>
    >;

    // get unique ids of all known machines that have a deployment from this MS
    const machineIdsWithDeployments = allKnownDeployments
      .flatMap((d) => d.machineIds)
      .reduce(
        (map, id) => {
          map[id] = true;
          return map;
        },
        {} as Record<string, true>,
      );

    // get all (reachable) engines known to the MS
    const reachableEngines = await AsyncArray.from(
      savedEnginesToEngines(await db.engine.findMany()),
    )
      .map(({ machines }) => machines)
      .flatten()
      .deduplicate((e) => e.id);

    const reachableWithDeployments = reachableEngines.filter(
      (e) => machineIdsWithDeployments[e.id],
    );

    const fetched = await asyncMap(reachableWithDeployments, async (e) => {
      const deployed = await fetchDeployments([e]);

      return deployed.map((d) => ({ ...d, machine: e }));
    }).flatten();

    const allDeploymentsFound = fetched.reduce(
      (acc, deployment) => {
        const alreadyFound = acc[deployment.definitionId];
        if (!alreadyFound) {
          acc[deployment.definitionId] = {
            versions: Object.fromEntries(
              deployment.versions.map((v) => [
                v.versionId,
                { ...v, machines: [deployment.machine] },
              ]),
            ),
            instances: Object.fromEntries(
              deployment.instances.map((i) => [
                i.processInstanceId,
                { ...i, machines: [deployment.machine] },
              ]),
            ),
          };
        } else {
          deployment.versions.forEach((v) => {
            const alreadyFoundVersion = alreadyFound.versions[v.versionId];
            if (!alreadyFoundVersion) {
              alreadyFound.versions[v.versionId] = { ...v, machines: [deployment.machine] };
            } else {
              alreadyFoundVersion.machines.push(deployment.machine);
            }
          });
          deployment.instances.forEach((i) => {
            const alreadyFoundInstance = alreadyFound.instances[i.processInstanceId];
            if (!alreadyFoundInstance) {
              alreadyFound.instances[i.processInstanceId] = {
                ...i,
                machines: [deployment.machine],
              };
            } else {
              // TODO: if we find an instance on multiple machines we need to merge the instance state
              // since the instance information on both machines might only be partial
              alreadyFoundInstance.machines.push(deployment.machine);
            }
          });
        }

        return acc;
      },
      {} as Record<
        string,
        {
          versions: Record<string, VersionInfo & { machines: Engine[] }>;
          instances: Record<string, InstanceInfo & { machines: Engine[] }>;
        }
      >,
    );

    // get the information that has updated for the known deployments
    const updates = await AsyncArray.from(allKnownDeployments)
      .map(async (d) => {
        // early exit if no new information could have been fetched
        if (!reachableEngines.some((e) => d.machineIds.includes(e.id))) return undefined;

        const fetchedProcess = allDeploymentsFound[d.version.processId];
        const fetchedVersion = fetchedProcess?.versions[d.version.id];

        // remove the deployment from the machines it was found on if it is marked as removed
        if (d.deleted && fetchedVersion.machines.length) {
          fetchedVersion.machines = await asyncFilter(fetchedVersion.machines, async (m) => {
            try {
              await removeDeploymentFromMachines([m], d.version.processId);
              return false;
            } catch (err) {
              return true;
            }
          });
        }

        // TODO: set the active state of the version to inactive on all machines where it is
        // unexpectedly active

        // we say the deployment still exists on the machine if the machine cannot be reached to check
        // or if the previous fetching operation returned a deployment of the same process version on
        // the machine
        // TODO: should we handle that it might happen that the machine becomes unreachable between the
        // initial reachability check and the fetching of the deployment information?
        // (this could lead to the machine being removed here)
        const stillDeployedOn = d.machineIds.filter(
          (mId) =>
            !reachableEngines.some((e) => e.id === mId) ||
            fetchedVersion?.machines.some((m) => m.id === mId),
        );

        // get the information that has updated for known instances
        const instances = d.instances.map((i) => {
          const fetchedInstance = fetchedProcess?.instances[i.id];
          // same as for the deployment: if the machine is reachable but did not return the instance
          // information we expect the instance to have been removed from the machine

          // TODO: handle that instances can be forwaded automatically which might change the list of
          // machines the deployment can be found on
          const stillRunningOn = i.machineIds.filter(
            (mId) =>
              !reachableEngines.some((e) => e.id === mId) ||
              fetchedInstance?.machines.some((m) => m.id === mId),
          );

          return {
            id: i.id,
            machineIds: stillRunningOn,
            state: fetchedInstance || i.state,
          };
        });

        const knownInstances = Object.fromEntries(d.instances.map((i) => [i.id, true]));

        const newInstances = Object.values(fetchedProcess?.instances || {}).map((i) => {
          if (
            // check for unknown instances that have been automatically started for this deployemnt
            !knownInstances[i.processInstanceId] &&
            // we assume that each process version has exactly one deployment
            i.processVersion === d.version.id &&
            // avoid adding manually started instances which are added to the db by the function that
            // triggered the instance start
            !i.processInitiator
          ) {
            return {
              id: i.processInstanceId,
              versionId: i.processVersion,
              // we assume that every process version has exactly one deployment
              deploymentId: d.id,
              state: { ...i, machines: undefined },
              machineIds: i.machines.map((m) => m.id),
            };
          }
        });

        return {
          deployment: d,
          machineIds: stillDeployedOn,
          deleted: !stillDeployedOn.length || d.deleted,
          active: stillDeployedOn.length && d.active,
          instances,
          newInstances,
        };
      })
      .nonNullable();

    const deploymentUpdates = updates.map(
      (u) => [u.deployment, { machineIds: u.machineIds, deleted: u.deleted }] as const,
    );

    const instanceUpdates = updates.flatMap((u) =>
      u.instances.map(
        (i) =>
          [
            i.id,
            {
              deploymentId: u.deployment.id,
              machineIds: i.machineIds,
              state: { ...i.state, machines: undefined },
            },
          ] as const,
      ),
    );

    const newInstances = updates.flatMap((u) => u.newInstances).filter(truthyFilter);

    await db.$transaction(async (tx) => {
      await Promise.all([
        ...deploymentUpdates.map(async ([deployment, changes]) => {
          revalidateTag(`deployment/process/${deployment.version.processId}`, 'max');
          await tx.processDeployment.update({
            where: { id: deployment.id },
            data: changes,
          });
        }),
        ...instanceUpdates.map(async ([instanceId, changes]) => {
          revalidateTag(`instance/${instanceId}`, 'max');
          await tx.processInstance.update({
            where: { id: instanceId },
            data: changes,
          });
        }),
        tx.processInstance.createMany({ data: newInstances }),
      ]);

      newInstances.forEach((data) =>
        revalidateTag(`deployment/process/${data.state.processId}`, 'max'),
      );
    });

    const knownInstances = Object.fromEntries(
      instanceUpdates
        .map((u) => ({
          instanceId: u[0],
          state: { ...u[1].state, machines: undefined },
          deploymentId: u[1].deploymentId,
        }))
        .concat(
          newInstances.map((i) => ({
            instanceId: i.id,
            state: i.state,
            deploymentId: i.deploymentId,
          })),
        )
        .map((i) => [i.instanceId, i]),
    );

    await updateTaskInfo(
      reachableEngines,
      reachableWithDeployments,
      allKnownDeployments,
      knownInstances,
    );
  } catch (err) {
    console.error('Error fetching deployment information: ', err);
  }

  // allow the next update to happen in 10 seconds from now
  global.isRefetchingDeployments = false;
  global.lastDeploymentsRefetchTime = Date.now();
}
