'use server';

import {
  getElementMachineMapping,
  getProcessConstraints,
  getStartEvents,
  getTaskConstraintMapping,
  toBpmnObject,
} from '@proceed/bpmn-helper';
// TODO: remove this ignore once the decider is typed
// @ts-ignore
// import decider from '@proceed/decider';
import { Engine } from './machines';
import { prepareExport } from '../process-export/export-preparation';
import { Prettify } from '../typescript-utils';
import { engineRequest } from './endpoints/index';
import { asyncForEach } from '../helpers/javascriptHelpers';
import { UserFacingError } from '../user-error';

type ProcessesExportData = Prettify<Awaited<ReturnType<typeof prepareExport>>>;

export async function removeDeploymentFromMachines(machines: Engine[], definitionId: string) {
  await asyncForEach(machines, async (machine: Engine) => {
    await engineRequest({
      method: 'delete',
      endpoint: '/process/:definitionId',
      pathParams: { definitionId },
      engine: machine,
    });
  });
}

async function deployProcessToMachines(
  machines: Engine[],
  processesExportData: ProcessesExportData,
) {
  try {
    // TODO: check if the order of the processes matters
    const allMachineRequests = machines.map((engine) => {
      return Promise.all(
        processesExportData!.map(async (exportData) => {
          const version = Object.values(exportData.versions)[0];
          await engineRequest({
            method: 'post',
            endpoint: '/process/',
            body: { bpmn: version.bpmn },
            engine,
          });

          if (version.startForm) {
            engineRequest({
              method: 'put',
              endpoint: '/process/:definitionId/versions/:version/start-form',
              pathParams: {
                definitionId: exportData.definitionId,
                version: Object.keys(exportData.versions)[0],
              },
              body: {
                html: version.startForm.html,
              },
              engine,
            });
          }

          const userTasks = exportData.userTasks.map((userTask) =>
            engineRequest({
              method: 'put',
              endpoint: '/process/:definitionId/user-tasks/:fileName',
              pathParams: { definitionId: exportData.definitionId, fileName: userTask.filename },
              engine,
              body: { html: userTask.html },
            }),
          );

          const scripts = exportData.scriptTasks.map((scriptTask) => {
            if (!scriptTask.js)
              throw Error(
                `Missing js for a script task (${scriptTask.filename}) in a process that is being deployed`,
              );

            engineRequest({
              method: 'put',
              endpoint: '/process/:definitionId/script-tasks/:fileName',
              pathParams: { definitionId: exportData.definitionId, fileName: scriptTask.filename },
              engine,
              body: { script: scriptTask.js },
            });
          });

          const images = exportData.images.map((image) =>
            engineRequest({
              method: 'put',
              endpoint: '/resources/process/:definitionId/images/:fileName',
              pathParams: { definitionId: exportData.definitionId, fileName: image.filename },
              engine,
              // TODO: make sure that images are being sent correctly
              // the pain point is probably going to be MQTT
              body: { type: 'Buffer', data: image.data },
            }),
          );

          await Promise.all([...scripts, ...userTasks, ...images]);
        }),
      );
    });

    await Promise.all(allMachineRequests);
  } catch (error) {
    // TODO: don't remove the whole process when deploying a single version fails
    await asyncForEach(Object.values(processesExportData), async ({ definitionId }) => {
      await removeDeploymentFromMachines(machines, definitionId);
    });

    throw error;
  }
}

async function dynamicDeployment(
  definitionId: string,
  version: string,
  processesExportData: ProcessesExportData,
  machines: Engine[],
) {
  const process = processesExportData.find(({ definitionId: id }) => id === definitionId);
  if (!process) throw new Error('Process not found in processesExportData');
  const bpmn = process.versions[version].bpmn;

  const bpmnObj = await toBpmnObject(bpmn);
  const startEventIds = await getStartEvents(bpmnObj);
  const processConstraints = await getProcessConstraints(bpmnObj);
  const taskConstraintMapping = await getTaskConstraintMapping(bpmnObj);

  let preferredMachine: Engine;

  // TODO: use decider
  // // use decider to get sorted list of viable engines
  // const { engineList } = await decider.findOptimalExternalMachine(
  //   { id: definitionId, nextFlowNode: startEventIds[0] },
  //   taskConstraintMapping[startEventIds[0]] || {},
  //   processConstraints || {},
  //   addedMachines,
  // );
  //
  // // try to get the best engine
  // [preferredMachine] = engineList;

  preferredMachine = machines[Math.floor(Math.random() * machines.length)];

  // there is no deployable machine known to the MS
  if (!preferredMachine) {
    throw new UserFacingError('There is no machine the process can be deployed to.');
  }

  await deployProcessToMachines([preferredMachine], processesExportData);
}

async function staticDeployment(
  definitionId: string,
  version: string,
  processesExportData: ProcessesExportData,
  machines: Engine[],
) {
  const process = processesExportData.find(({ definitionId: id }) => id === definitionId);
  if (!process) throw new UserFacingError('Process not found in processesExportData');
  const bpmn = process.versions[version].bpmn;

  const nodeToMachineMapping = Object.values(await getElementMachineMapping(bpmn));

  const targetedMachines: Engine[] = [];

  // Check if all necessary machines are available
  for (const mapping of nodeToMachineMapping) {
    let machine;

    // TODO: add this once the structure of Engine is final
    // if (mapping.machineId) {
    //   machine = machines.find(({ id }) => id === mapping.machineId);
    // } else if (mapping.machineAddress) {
    //   const [ip, port] = mapping.machineAddress
    //     .replace(/\[?((?:(?:\d|\w)|:|\.)*)\]?:(\d*)/g, '$1+$2')
    //     .split('+');
    //   machine = machines.find((m) => ip === m.ip && +port === m.port);
    // }
    //
    // if (!machine) {
    //   throw new Error("Can't find machine with given id to resolve address");
    // }
    // targetedMachines.push(machine);
  }

  // TODO: add this check once the structure of Engine is final
  // Add forceMachine if it is not already in the list
  // if (
  //   forceMachine &&
  //   !targetedMachines.some(({ ip, port }) => ip === forceMachine.ip && port == forceMachine.port)
  // )
  //   targetedMachines.push(forceMachine);

  await deployProcessToMachines(targetedMachines, processesExportData);
}

export async function deployProcess(
  definitionId: string,
  version: string,
  spaceId: string,
  method: 'static' | 'dynamic',
  machines: Engine[],
) {
  if (machines.length === 0) throw new UserFacingError('No machines available for deployment');

  const processesExportData = await prepareExport(
    {
      type: 'bpmn',
      subprocesses: true,
      imports: true,
      artefacts: true,
      scaling: 1,
      exportSelectionOnly: false,
    },
    [
      {
        definitionId,
        processVersion: version,
      },
    ],
    spaceId,
  );

  if (method === 'static') {
    await staticDeployment(definitionId, version, processesExportData, machines);
  } else {
    await dynamicDeployment(definitionId, version, processesExportData, machines);
  }
}
export type ImportInformation = { definitionId: string; processId: string; version: number };
export type VersionDependencies = {
  html: string[];
  images: string[];
  imports: ImportInformation[];
};
export type VersionInfo = {
  bpmn: string;
  deploymentDate: number;
  definitionName: string;
  deploymentMethod: string;
  needs: VersionDependencies;
  versionId: string;
  versionName: string;
  versionDescription: string;
};
export type InstanceInfo = {
  processId: string;
  processInstanceId: string;
  globalStartTime: number;
  instanceState: string[];
  tokens: {
    machineHops: number;
    deciderStorageTime: number;
    deciderStorageRounds: number;
    localStartTime: number;
    tokenId: string;
    state: string;
    currentFlowElementId: string;
    currentFlowNodeState: string;
    currentFlowElementStartTime: number;
    previousFlowElementId: string;
    intermediateVariablesState?: { [key: string]: any };
    localExecutionTime: number;
    currentFlowNodeProgress?: { value: number; manual: boolean };
    milestones: { [name: string]: number };
    priority?: number;
    costsRealSetByOwner?: string;
  }[];
  variables: {};
  log: {
    flowElementId: string;
    tokenId: string;
    executionState: string;
    startTime: number;
    endTime: number;
    progress?: {
      value: number;
      manual: boolean;
    };
    machine: {
      id: string;
      name: string;
      ip: string;
      port: number;
    };
    executionWasInterrupted?: true;
    priority?: number;
    costsRealSetByOwner?: string;
  }[];
  adaptationLog: any[];
  processVersion: string;
  userTasks: any[];
};
export type DeployedProcessInfo = {
  definitionId: string;
  versions: VersionInfo[];
  instances: InstanceInfo[];
};

export async function getDeployments(engines: Engine[], entries?: string) {
  const deploymentsresponse = await Promise.allSettled(
    engines.map(async (engine) =>
      engineRequest({
        method: 'get',
        endpoint: '/process/',
        engine,
        queryParams: {
          entries,
        },
      }),
    ),
  );

  const deployments = deploymentsresponse
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result.status === 'fulfilled' ? result.value : null))
    .flat(1) as DeployedProcessInfo[];

  return deployments as DeployedProcessInfo[];
}
