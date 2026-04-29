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
  getProcessImageFromMachine,
  removeDeploymentFromMachines,
  changeDeploymentActivation as _changeDeploymentActivation,
  VersionInfo,
  InstanceInfo,
} from './deployment';
import { Engine } from './machines';
import { savedEnginesToEngines } from './saved-engines-helpers';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { enableUseDB } from 'FeatureFlags';
import { getDbEngineByAddress, getAvailableMachines } from '@/lib/data/db/engines';
import { asyncFilter, asyncMap, asyncForEach, AsyncArray } from '../helpers/javascriptHelpers';

import db from '@/lib/data/db';

import {
  activateUserTask,
  completeTasklistEntryOnMachine,
  getTaskListFromMachine,
  setTasklistEntryVariableValuesOnMachine,
  setTasklistEntryMilestoneValuesOnMachine,
  addOwnerToTaskListEntryOnMachine,
} from './tasklist';
import { MapNestedType, Prettify, truthyFilter } from '../typescript-utils';
import {
  inlineUserTaskData,
  getCorrectVariableState,
  getCorrectMilestoneState,
  inlineScript,
  getGlobalVariables,
} from '@proceed/user-task-helper';

import { getUserTaskById, updateUserTask } from '../data/user-tasks';
import { getFileFromMachine, submitFileToMachine, updateVariablesOnMachine } from './instances';
import { getProcessIds, getVariablesFromElementById } from '@proceed/bpmn-helper';
import { Variable } from '@proceed/bpmn-helper/src/getters';
import Ability from '../ability/abilityHelper';
import {
  addDeployment,
  getInstance as getStoredInstance,
  updateDeployment,
  getProcessDeployments,
} from '../data/deployment';
import { getProcessBPMN, getProcessHtmlFormHTML } from '../data/processes';
import { getDataObject, isErrorResponse } from '@/app/api/spaces/[spaceId]/data/helper';
import { getInstanceFile, saveInstanceArtifact } from '../data/file-manager-facade';
import { revalidateTag } from 'next/cache';

// TODO: still needed?
export async function getCorrectTargetEngines(
  spaceId: string,
  onlyProceedEngines = false,
  validatorFunc?: (engine: Engine) => Promise<boolean>,
  ability?: Ability,
) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  let engines: Engine[] = [];
  if (onlyProceedEngines) {
    // force that only proceed engines are supposed to be used
    engines = await getAvailableMachines(null, undefined, 'dont-check');
  } else {
    // use all available engines
    const [proceedEngines, spaceEngines] = await Promise.all([
      getAvailableMachines(null, undefined, 'dont-check'),
      getAvailableMachines(spaceId, ability),
    ]);

    engines = proceedEngines;
    engines = engines.concat(spaceEngines);
  }

  if (validatorFunc) engines = await asyncFilter(engines, validatorFunc);

  return engines;
}

export async function deployProcess(
  definitionId: string,
  versionId: string,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
  _forceEngine?: Engine | Engine[] | 'PROCEED',
) {
  try {
    // TODO: manage permissions for deploying a process

    if (!enableUseDB) throw new Error('deployProcess only available with enableUseDB');

    const { userId } = await getCurrentUser();

    let engines: Engine[];
    if (_forceEngine && _forceEngine !== 'PROCEED') {
      // forcing a specific engine
      const { ability } = await getCurrentEnvironment(spaceId);

      async function resolveEngines(engines: Engine[]) {
        const addresses = engines.map((engine) =>
          engine.type === 'http' ? engine.address : engine.brokerAddress,
        );
        // TODO: can this be changed?
        const spaceEngines = await db.$transaction(async () => {
          return await asyncMap(addresses, async (address) =>
            getDbEngineByAddress(address, spaceId, ability),
          );
        });
        if (spaceEngines.some((spaceEngine) => !spaceEngine)) {
          throw new Error('No matching space engine found');
        }
        return await AsyncArray.from(
          savedEnginesToEngines(spaceEngines as NonNullable<(typeof spaceEngines)[number]>[]),
        )
          .map(({ machines }) => machines)
          .flatten();
      }

      if (Array.isArray(_forceEngine)) {
        engines = await resolveEngines(_forceEngine);
        if (!engines.length) throw new Error('Could not reach any engine.');
      } else {
        engines = await resolveEngines([_forceEngine]);
        if (!engines.length) throw new Error("Engine couldn't be reached");
      }
    } else {
      engines = await getCorrectTargetEngines(spaceId, _forceEngine === 'PROCEED');
    }

    if (!engines.length) throw new UserFacingError('No fitting engine found.');

    const alreadyDeployed = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(alreadyDeployed)) return alreadyDeployed;

    // find all currently available deployments
    const processAlreadyDeployedInfo = alreadyDeployed
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
    if (!enableUseDB) throw new Error('removeDeployment only available with enableUseDB');

    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('manage', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);

    const deployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(deployments)) return deployments;

    const engines = await getCorrectTargetEngines(spaceId, false);

    await asyncForEach(deployments, async (deployment) => {
      const stillDeployedOn = await asyncMap(deployment.machineIds, async (machineId) => {
        try {
          // check if the engine is currently reachable if not we have to remove the deployment at
          // a future time when it becomes reachable again
          const machine = engines.find((engine) => engine.id === machineId);
          if (!machine) return machineId;

          // remove the deployment from the engine
          // this will also affect other deployments of the same process but since this function
          // is aimed at removing all deployments of the process, this should not be a problem
          await removeDeploymentFromMachines([machine], deployment.processId);
        } catch (err) {
          // could not remove the deployment so we keep the machine as still having the
          // deployment
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
    const engines = await getCorrectTargetEngines(spaceId, false);
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
              // change the activation on a single machine so we do not spawn new instances on multiple machines at once
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

export async function getGlobalVariablesForHTML(
  spaceId: string,
  initiatorId: string,
  html: string,
) {
  return await getGlobalVariables(html, async (varPath) => {
    let segments = varPath.split('.');

    let userId: string | undefined;

    if (segments[0] === '@process-initiator') {
      userId = initiatorId;
    } else if (segments[0] === '@worker' || !segments[0].startsWith('@')) {
      ({ userId } = await getCurrentUser());
    } else if (segments[0] !== '@organization') {
      throw new UserFacingError(
        `Invalid selector for global data access in user task html. (${segments[0]})`,
      );
    }

    if (segments[0].startsWith('@')) segments = segments.slice(1);

    const result = await getDataObject(spaceId, segments.join('.'), userId);

    if (isErrorResponse(result)) {
      throw new UserFacingError(await result.data.text());
    }

    return result.data?.value;
  });
}

export async function getTasklistEntryHTML(spaceId: string, userTaskId: string) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    let { initialVariables, variableChanges, milestones, milestonesChanges, html } = storedUserTask;

    variableChanges = { ...initialVariables, ...(variableChanges || {}) };

    if (milestonesChanges) {
      milestones = (milestones || []).map((milestone) => ({
        ...milestone,
        value: milestonesChanges![milestone.id] ?? milestone.value,
      }));
    }

    // maps relative urls used to get resources on the engine to the MS api to allow them to work here as well
    function mapResourceUrls(variables: Record<string, any>) {
      if (!variables) return variables;

      return Object.fromEntries(
        Object.entries(variables).map(([key, value]) => {
          const [_, instanceId] = userTaskId.split('|');
          const [definitionId] = instanceId.split('-_');

          if (
            typeof value === 'string' &&
            value.includes(`resources/process/${definitionId}/instance/${instanceId}/file/`)
          ) {
            return [key, `api/private/${spaceId}/engine/` + value];
          }

          return [key, value];
        }),
      );
    }

    let globalVars: Record<string, any> = {};

    if (storedUserTask.instanceID) {
      const instance = await getStoredInstance(spaceId, storedUserTask.instanceID);
      if (isUserErrorResponse(instance)) return instance;
      if (!instance) throw new Error('Cannot retrieve the instance initiator information.');
      if (!instance.initiatorId) throw new Error('Missing initiator information');

      globalVars = await getGlobalVariablesForHTML(spaceId, instance.initiatorId, html);
    }

    variableChanges = { ...variableChanges, ...globalVars };

    return inlineUserTaskData(html, mapResourceUrls(variableChanges), milestones);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function addOwnerToTaskListEntry(
  userTaskId: string,
  owner: string,
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    let { actualOwner } = storedUserTask;

    if (!actualOwner.includes(owner)) {
      await updateUserTask(userTaskId, {
        actualOwner: [...actualOwner, owner],
      });

      if (engine) {
        const [taskId, instanceId] = userTaskId.split('|');

        return await addOwnerToTaskListEntryOnMachine(engine, instanceId, taskId, owner);
      }
    }

    return {};
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function setTasklistEntryVariableValues(
  userTaskId: string,
  variables: { [key: string]: any },
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    await updateUserTask(userTaskId, {
      variableChanges: { ...storedUserTask.variableChanges, ...variables },
    });

    if (engine) {
      const [taskId, instanceId] = userTaskId.split('|');

      await setTasklistEntryVariableValuesOnMachine(engine, instanceId, taskId, variables);
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function setTasklistMilestoneValues(
  userTaskId: string,
  milestones: { [key: string]: any },
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    await updateUserTask(userTaskId, {
      milestonesChanges: { ...storedUserTask.milestonesChanges, ...milestones },
    });

    if (engine) {
      const [taskId, instanceId] = userTaskId.split('|');

      await setTasklistEntryMilestoneValuesOnMachine(engine, instanceId, taskId, milestones);
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function completeTasklistEntry(
  userTaskId: string,
  variables: { [key: string]: any },
  engine: Engine | null,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const storedUserTask = await getUserTaskById(userTaskId);

    if (!storedUserTask || 'error' in storedUserTask) {
      throw new Error('Failed to get stored user task data.');
    }

    const { variableChanges, milestonesChanges } = storedUserTask;

    if (engine) {
      const [taskId, instanceId] = userTaskId.split('|');

      // push the values from the database to the engine so the instance state is correctly updated
      // when the user task is completed as the next step
      await setTasklistEntryVariableValuesOnMachine(
        engine,
        instanceId,
        taskId,
        variableChanges || {},
      );
      await setTasklistEntryMilestoneValuesOnMachine(
        engine,
        instanceId,
        taskId,
        milestonesChanges || {},
      );

      await completeTasklistEntryOnMachine(engine, instanceId, taskId, variables);
    }

    await updateUserTask(userTaskId, {
      variableChanges: { ...variableChanges, ...variables },
      state: 'COMPLETED',
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function updateVariables(
  spaceId: string,
  definitionId: string,
  instanceId: string,
  variables: Record<string, any>,
) {
  try {
    if (!enableUseDB) throw new Error('updateVariables only available with enableUseDB');

    const instance = await getStoredInstance(spaceId, instanceId);

    if (isUserErrorResponse(instance)) return instance;

    if (!instance) return userError('Could not find the instance to change.');

    // find the engine the instance is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      return instance.machineIds.includes(engine.id);
    });

    if (!engines.length) return userError('Could not reach the engines the instance is running on');

    await asyncForEach(
      engines,
      async (engine) => await updateVariablesOnMachine(definitionId, instanceId, engine, variables),
    );
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function submitFile(engine: Engine | null, userTaskId: string, formData: FormData) {
  try {
    const file = formData.get('file') as File;

    const fileName = file.name;
    const fileType = file.type;

    const [_, instanceId] = userTaskId.split('|');
    const [definitionId] = instanceId.split('-_');

    // TODO: implement file storing for user tasks in the MS to allow files to be stored for local
    // user tasks and also for user tasks that are cached in the MS
    if (!engine) throw new Error('Could not find the engine to submit the file to');

    const res = await submitFileToMachine(
      definitionId,
      instanceId,
      engine,
      fileName,
      fileType,
      Array.from(new Uint8Array(await file.arrayBuffer())),
    );

    return res;
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function getFile(
  spaceId: string,
  definitionId: string,
  instanceId: string,
  fileName: string,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  const instance = await getStoredInstance(spaceId, instanceId);

  if (isUserErrorResponse(instance)) return instance;

  if (!instance) {
    throw new UserFacingError('Unknown instance.');
  }

  const savedFile = await getInstanceFile(instanceId, fileName);
  if (savedFile) {
    return savedFile;
  }

  try {
    // find the engine the instance is running on
    let engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      return instance.machineIds.includes(engine.id);
    });

    engines = ability ? ability.filter('view', 'Machine', engines) : engines;

    if (!engines.length) {
      throw new UserFacingError('Failed to find the engine the instance is running on!');
    }

    const file = await getFileFromMachine(definitionId, instanceId, fileName, engines[0]);

    try {
      const res = await saveInstanceArtifact(
        spaceId,
        instanceId,
        fileName,
        file.type,
        Buffer.from(await file.arrayBuffer()),
      );

      if (res.presignedUrl) {
        // TODO: handle cloud storage case
      }
    } catch (err) {
      console.error(`Failed to cache instance file ${fileName}.`);
    }

    return file;
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function getProcessImage(spaceId: string, definitionId: string, fileName: string) {
  try {
    if (!enableUseDB) throw new Error('getProcessImage only available with enableUseDB');

    // find the engine the instance is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
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

/**
 * Fetches the deployments information from all engine that are expected to have a deployed process
 * from this MS
 **/
export async function refetchDeployments() {
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
              return true;
            } catch (err) {
              return false;
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
          const fetchedInstance = fetchedProcess.instances[i.id];
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
            { deploymentId: u.deployment.id, machineIds: i.machineIds, state: i.state },
          ] as const,
      ),
    );

    const newInstances = updates.flatMap((u) => u.newInstances).filter(truthyFilter);

    await db.$transaction(async (tx) => {
      await asyncForEach(deploymentUpdates, async ([deployment, changes]) => {
        revalidateTag(`deployment/process/${deployment.version.processId}`, 'max');
        await tx.processDeployment.update({
          where: { id: deployment.id },
          data: changes,
        });
      });

      await asyncForEach(instanceUpdates, async ([instanceId, changes]) => {
        revalidateTag(`instance/${instanceId}`, 'max');
        await tx.processInstance.update({
          where: { id: instanceId },
          data: changes,
        });
      });

      await asyncForEach(newInstances, async (data) => {
        revalidateTag(`deployment/process/${data.state.processId}`, 'max');
        await tx.processInstance.create({ data });
      });
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

    // get all users tasks that belong to instances (they were not created in the task editor)
    const knownUserTasks = await db.userTask.findMany({ where: { NOT: { instanceID: null } } });

    const reachableWithUserTasks = reachableEngines.filter((e) =>
      knownUserTasks.some((uT) => uT.machineId === e.id),
    );

    const reachableWithDeploymentsAndUserTasks = await AsyncArray.from(
      reachableWithDeployments.concat(reachableWithUserTasks),
    ).deduplicate((e) => e.id);

    const fetchedUserTasks = Object.fromEntries(
      await asyncMap(reachableWithDeploymentsAndUserTasks, async (e) => {
        const tasklist = await getTaskListFromMachine(e);

        return tasklist.map((entry) => ({ ...entry, machineId: e.id }));
      })
        .flatten()
        .filter((uT) => !!knownInstances[uT.instanceID])
        .map((uT) => [`${uT.id}|${uT.instanceID}|${uT.startTime}`, uT]),
    );

    const removedUserTasks = knownUserTasks.filter((uT) => {
      return (
        // get all user tasks that should be on a reachable engine but that were not returned when
        // we fetched for new user task information
        uT.machineId &&
        reachableWithDeploymentsAndUserTasks.some((e) => e.id === uT.machineId) &&
        !fetchedUserTasks[uT.id]
      );
    });

    const addedUserTasks = (
      await AsyncArray.from(Object.entries(fetchedUserTasks))
        .filter(([id]) => {
          return !knownUserTasks.some((kUT) => kUT.id === id);
        })
        .map(async ([id, task]) => {
          const relatedInstanceInfo = knownInstances[task.instanceID];
          const relatedDeploymentId = relatedInstanceInfo?.deploymentId;
          const relatedDeployment =
            relatedDeploymentId && allKnownDeployments.find((d) => d.id === relatedDeploymentId);

          if (!relatedDeployment) return;

          const machine = reachableEngines.find((e) => e.id === task.machineId);
          if (!machine) return;

          try {
            const definitionId = relatedDeployment.version.processId;
            const spaceId = relatedDeployment.version.process.environmentId;
            const bpmn = await getProcessBPMN(
              definitionId,
              spaceId,
              relatedDeployment.version.id,
              undefined,
              true,
            );

            if (isUserErrorResponse(bpmn)) return;

            const initialVariables = getCorrectVariableState(task, relatedInstanceInfo.state);
            const milestones = await getCorrectMilestoneState(
              bpmn,
              task,
              relatedInstanceInfo.state,
            );

            const fileName = task.attrs['proceed:fileName'];
            const htmlForm = await getProcessHtmlFormHTML(
              definitionId,
              fileName,
              spaceId,
              undefined,
              true,
            );

            if (isUserErrorResponse(htmlForm)) return;

            let html = htmlForm.replace(/\/resources\/process[^"]*/g, (match) => {
              const path = match.split('/');
              return `/api/private/${spaceId}/engine/resources/process/${task.instanceID}/images/${path.pop()}`;
            });

            const processIds = await getProcessIds(bpmn);
            let variableDefinitions: undefined | Variable[];
            if (processIds.length) {
              const [processId] = processIds;
              variableDefinitions = await getVariablesFromElementById(bpmn, processId);
            }

            html = inlineScript(html, task.instanceID, id, variableDefinitions);

            // TODO
            // if (storedState === 'READY') {
            //   await activateUserTask(engine, instanceId, taskId, startTime);
            //   storedState = 'ACTIVE';
            // }

            return {
              ...task,
              attrs: undefined,
              performers: undefined,
              id,
              taskId: task.id,
              fileName,
              potentialOwners: task.performers,
              startTime: task.startTime,
              environmentId: relatedDeployment.version.process.environmentId,
              initialVariables,
              variableChanges: {},
              milestones,
              milestonesChanges: {},
              html,
            };
          } catch (err) {
            console.error('Error', err);
          }
        })
    ).filter(truthyFilter);

    const updatedUserTasks = Object.entries(fetchedUserTasks)
      .filter(([id]) => {
        return knownUserTasks.some((kUT) => kUT.id === id);
      })
      .map(
        ([id, data]) =>
          [
            id,
            {
              actualOwner: data.actualOwner,
              state: data.state,
              status: data.status,
              priority: data.priority,
              progress: data.progress,
              endTime: data.endTime,
              machineId: data.machineId,
            },
          ] as const,
      );

    await db.$transaction(async (tx) => {
      await tx.userTask.updateMany({
        where: { OR: removedUserTasks.map((uT) => ({ id: uT.id })) },
        data: { machineId: '' },
      });

      await tx.userTask.createMany({
        data: addedUserTasks.map((uT) => ({
          ...uT,
          startTime: new Date(uT.startTime),
          endTime: new Date(uT.endTime),
        })),
      });

      await asyncForEach(updatedUserTasks, async ([id, data]) => {
        await tx.userTask.update({
          where: { id },
          data: {
            ...data,
            endTime: new Date(data.endTime),
          },
        });
      });
    });
  } catch (err) {
    console.error('Error fetching deployment information: ', err);
  }

  setTimeout(refetchDeployments, 10000);

  // const deployments = await getProcessDeployments(spaceId, processId);

  // const instances = await getProcessInstances(spaceId, processId);

  // if (isUserErrorResponse(deployments)) return deployments;
  // if (isUserErrorResponse(instances)) return instances;

  // await asyncMap(deployments, async (deployment) => {
  //   let { machineIds } = deployment;

  //   // update the list of machines on which we expect the deployment to exist
  //   const machines = await AsyncArray.from(machineIds)
  //     // if a machine is reachable we fetch the newest information otherwise we assume that nothing
  //     // changed until we can reach the machine again
  //     .map((id) => reachableEngines.find((e) => e.id === id) || id)
  //     .filter(async (machine) => {
  //       if (typeof machine !== 'string') {
  //         if (deployment.deleted) {
  //           try {
  //             // remove the deployment from the machine and remove the machine from the
  //             // machine list
  //             await removeDeploymentFromMachines([machine], deployment.processId);
  //             return false;
  //           } catch (err) { }
  //         } else {
  //           try {
  //             await fetchDeployment(machine, deployment.processId, 'definitionId');
  //           } catch (err) {
  //             // remove the machine from the machine list if the deployment has been removed for
  //             // some reason
  //             return false;
  //           }
  //         }
  //       }
  //       return true;
  //     });

  //   // TODO: handle that instances can be forwaded automatically which might change the list of
  //   // machines the deployment can be found on
  //   const fetchedInstances = await asyncMap(machines, async (machine) => {
  //     if (typeof machine !== 'string') {
  //       try {
  //         // try to get the newest information for all instances of the deployment
  //         const updatedInstances = await fetchDeployment(
  //           machine,
  //           deployment.processId,
  //           'instances',
  //         );

  //         return updatedInstances.instances
  //           .filter(({ processVersion }) => processVersion === deployment.versionId)
  //           .map((instance) => ({ instance, machine }));
  //       } catch (err) { }
  //     }

  //     return [];
  //   }).flatten();

  //   let knownInstances = Object.fromEntries(
  //     deployment.instances
  //       .map((iId) => {
  //         const instance = instances?.find((i) => i.id === iId);
  //         if (!instance) return;
  //         const filteredMachines = instance.machineIds.filter(
  //           (id) => !reachableEngines.some((e) => e.id === id),
  //         );

  //         const info = { data: { ...instance, machineIds: filteredMachines }, changed: false };
  //         return [iId, info] as [string, typeof info];
  //       })
  //       .filter(truthyFilter),
  //   );

  //   // update/extend the known instance information
  //   const updatedInstancesMap = fetchedInstances.reduce(
  //     (map, curr) => {
  //       const id = curr.instance.processInstanceId;
  //       if (id in map) {
  //         const known = map[id];
  //         if (!known.data.machineIds.includes(curr.machine.id)) {
  //           known.data.machineIds.push(curr.machine.id);
  //           // TODO: merge the instance state
  //           known.data.state = curr.instance;
  //           known.changed = true;
  //         }
  //       } else {
  //         map[id] = {
  //           data: {
  //             id,
  //             versionId: curr.instance.processVersion,
  //             deploymentId: deployment.id,
  //             machineIds: [curr.machine.id],
  //             state: curr.instance,
  //             initiatorId: curr.instance.processInitiator || null,
  //           },
  //           changed: true,
  //         };
  //       }

  //       return map;
  //     },
  //     JSON.parse(JSON.stringify(knownInstances)) as typeof knownInstances,
  //   );

  //   const updatedInstances = Object.values(updatedInstancesMap);

  //   // push instance changes to the database
  //   await asyncForEach(updatedInstances, async (instance) => {
  //     if (instance.changed) {
  //       if (!knownInstances[instance.data.id]) {
  //         try {
  //           // instances with an initiator should be created and manually added in this
  //           // management system instance so we should not add them automatically (this should
  //           // prevent timing problems when this logic runs before the instance has been manually
  //           // added)
  //           if (!instance.data.initiatorId) {
  //             await storeInstanceData(spaceId, instance.data, true);
  //           }
  //         } catch (err) { }
  //       } else {
  //         await updateStoredInstance(
  //           spaceId,
  //           instance.data.id,
  //           {
  //             state: instance.data.state,
  //           },
  //           true,
  //         );
  //       }
  //     }
  //   });

  //   return {
  //     ...deployment,
  //     deleted: !machines.length || deployment.deleted,
  //     // TODO: check for changes to the active state on reachable machines
  //     active: !machines.length ? false : deployment.active,
  //     instances: updatedInstances.map((u) => u.data),
  //     machineIds: machines.map((m) => (typeof m === 'string' ? m : m.id)),
  //   };
  // }).forEach(async (uD) => {
  //   const storedDeployment = deployments.find((sD) => sD.id === uD.id)!;

  //   // updated deleted status and machine information for deployments with changes
  //   if (
  //     (uD.deleted && !storedDeployment.deleted) ||
  //     uD.machineIds.length !== storedDeployment.machineIds.length ||
  //     !uD.machineIds.every((id, index) => id === storedDeployment.machineIds[index])
  //   ) {
  //     await updateDeployment(spaceId, uD.processId, uD.id, {
  //       deleted: uD.deleted,
  //       machineIds: uD.machineIds,
  //     });
  //   }
  // });
}

const global = globalThis as any;
if (!global.deploymentFetchLoopActive) {
  global.deploymentFetchLoopActive = true;
  refetchDeployments();
}

//type RefetchHandler = {
//  register: (spaceId: string, processId: string, userId: string) => void;
//  unregister: (spaceId: string, processId: string, userId: string) => void;
//  registrations: {
//    [spaceAndProcessId: string]: BackgroundUpdateRegister;
//  };
//};

// const global = globalThis as any;
// const deploymentRefetchHandler: RefetchHandler =
//   global.deploymentRefetchHandler ||
//   (global.deploymentRefetchHandler = {
//     /**
//      * Registers the interest of a user in updates for a specific process' deployments in a space
//      */
//     register(spaceId: string, processId: string, userId: string) {
//       const self = this as RefetchHandler;
//
//       const registrationId = `${spaceId}|${processId}`;
//
//       // register a new user or renew a users registration
//       let registration = self.registrations[registrationId];
//       if (!registration) {
//         console.log('Creating space registration index ', spaceId);
//         registration = self.registrations[registrationId] = new BackgroundUpdateRegister(
//           () => refetchDeployments(spaceId, processId),
//           () => {
//             console.log('No interest in updates for ', registrationId, ' anymore. Cleaning up.');
//             delete self.registrations[registrationId];
//           },
//           10000,
//         );
//       }
//
//       registration.registerUser(userId);
//     },
//     unregister(spaceId: string, processId: string, userId: string) {
//       const self = this as RefetchHandler;
//
//       const registrationId = `${spaceId}|${processId}`;
//
//       const registration = self.registrations[registrationId];
//       if (registration) {
//         registration.unregisterUser(userId);
//       }
//     },
//     registrations: {},
//   });
//
// export async function registerForDeploymentUpdates(spaceId: string, processId: string) {
//   const { userId, user } = await getCurrentUser();
//   if (!user) return userError('Only known users can register for deployment updates');
//   deploymentRefetchHandler.register(spaceId, processId, userId);
// }
//
// export async function unregisterFromDeploymentUpdates(spaceId: string, processId: string) {
//   const { userId, user } = await getCurrentUser();
//   if (!user) return userError('Only known users can register for deployment updates');
//   deploymentRefetchHandler.unregister(spaceId, processId, userId);
// }
