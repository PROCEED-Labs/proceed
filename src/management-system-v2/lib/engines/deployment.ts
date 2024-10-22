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
import { Machine, getMachines } from './machines';
import * as endpoints from './endpoints';
import { prepareExport } from '../process-export/export-preparation';
import { Prettify } from '../typescript-utils';

// TODO: better error handling

type ProcessesExportData = Prettify<Awaited<ReturnType<typeof prepareExport>>>;

async function deployProcessToMachines(
  machines: Machine[],
  processesExportData: ProcessesExportData,
) {
  try {
    // TODO: check if the order of the processes matters
    const allMachineRequests = machines.map((machine) => {
      return Promise.all(
        processesExportData!.map(async (exportData) => {
          const version = Object.values(exportData.versions)[0];
          await endpoints.deployProcess(machine, version.bpmn);

          const userTasks = exportData.userTasks.map((userTask) =>
            endpoints.sendUserTaskHTML(
              machine,
              exportData.definitionId,
              userTask.filename,
              userTask.html,
            ),
          );

          const images = exportData.images.map((image) =>
            endpoints.sendImage(machine, exportData.definitionId, image.filename, image.data),
          );

          await Promise.all([userTasks, images]);
        }),
      );
    });

    await Promise.all(allMachineRequests);
  } catch (error) {
    // TODO: don't remove the whole process when deploying a single version fails
    const removeAllDeployments = Object.values(processesExportData!).map(({ definitionId }) =>
      Promise.all(
        machines.map((machine) => endpoints.removeDeploymentFromMachines(machine, definitionId)),
      ),
    );
    await Promise.all(removeAllDeployments);

    throw error;
  }
}

async function dynamicDeployment(
  definitionId: string,
  version: number,
  processesExportData: ProcessesExportData,
  forceMachine?: Machine,
) {
  const process = processesExportData.find(({ definitionId: id }) => id === definitionId);
  if (!process) throw new Error('Process not found in processesExportData');
  const bpmn = process.versions[version].bpmn;

  const bpmnObj = await toBpmnObject(bpmn);
  const startEventIds = await getStartEvents(bpmnObj);
  const processConstraints = await getProcessConstraints(bpmnObj);
  const taskConstraintMapping = await getTaskConstraintMapping(bpmnObj);

  const addedMachines = (await getMachines()).filter(
    (machine) => !machine.discovered && machine.status === 'CONNECTED',
  );

  let preferredMachine: Machine;

  if (forceMachine) {
    preferredMachine = forceMachine;
  } else {
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

    preferredMachine = addedMachines[Math.floor(Math.random() * addedMachines.length)];
  }

  // there is no deployable machine known to the MS
  if (!preferredMachine) {
    throw new Error('There is no machine the process can be deployed to.');
  }

  try {
    deployProcessToMachines([preferredMachine], processesExportData);
  } catch (error) {}
}

async function staticDeployment(
  definitionId: string,
  version: number,
  processesExportData: ProcessesExportData,
  forceMachine?: Machine,
) {
  const process = processesExportData.find(({ definitionId: id }) => id === definitionId);
  if (!process) throw new Error('Process not found in processesExportData');
  const bpmn = process.versions[version].bpmn;

  const nodeToMachineMapping = Object.values(await getElementMachineMapping(bpmn));

  const machines = await getMachines();
  const targetedMachines: Machine[] = [];

  // Check if all necessary machines are available
  for (const mapping of nodeToMachineMapping) {
    let machine;

    if (mapping.machineId) {
      machine = machines.find(({ id }) => id === mapping.machineId);
    } else if (mapping.machineAddress) {
      const [ip, port] = mapping.machineAddress
        .replace(/\[?((?:(?:\d|\w)|:|\.)*)\]?:(\d*)/g, '$1+$2')
        .split('+');
      machine = machines.find((m) => ip === m.ip && +port === m.port);
    }

    if (!machine) {
      throw new Error("Can't find machine with given id to resolve address");
    }
    targetedMachines.push(machine);
  }

  // Add forceMachine if it is not already in the list
  if (
    forceMachine &&
    !targetedMachines.some(({ ip, port }) => ip === forceMachine.ip && port == forceMachine.port)
  )
    targetedMachines.push(forceMachine);

  await deployProcessToMachines(targetedMachines, processesExportData);
}

export async function deployProcess(
  definitionId: string,
  version: number,
  spaceId: string,
  method: 'static' | 'dynamic',
  forceMachine?: Machine,
) {
  const processesExportData = await prepareExport(
    {
      type: 'bpmn',
      subprocesses: true,
      imports: true,
      artefacts: true,
      scaling: 1,
      exportSelectionOnly: false,
      useWebshareApi: false,
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
    await staticDeployment(definitionId, version, processesExportData, forceMachine);
  } else {
    await dynamicDeployment(definitionId, version, processesExportData, forceMachine);
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
  version: number;
  versionName: string;
  versionDescription: string;
};
// TODO: refine type or iport it
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
    intermediateVariablesState: null;
    localExecutionTime: number;
  }[];
  variables: {};
  log: (
    | {
        flowElementId: string;
        tokenId: string;
        executionState: string;
        startTime: number;
        endTime: number;
        machine: {
          id: string;
          name: string;
          ip: string;
          port: number;
        };
        progress?: undefined;
      }
    | {
        flowElementId: string;
        tokenId: string;
        executionState: string;
        startTime: number;
        endTime: number;
        progress: {
          value: number;
          manual: boolean;
        };
        machine: {
          id: string;
          name: string;
          ip: string;
          port: number;
        };
      }
  )[];
  adaptationLog: any[];
  processVersion: string;
  userTasks: any[];
};
export type DeployedProcessInfo = {
  definitionId: string;
  versions: VersionInfo[];
  // TODO: refine instances type
  instances: InstanceInfo[];
};
export async function getDeployments() {
  const machines = (await getMachines()).filter((m) => m.status === 'CONNECTED');

  const deployments = await Promise.allSettled(
    machines.map(async (machine) => {
      const result = await endpoints.getDeploymentFromMachine(
        machine,
        'definitionId,versions,instances(processInstanceId,processVersion,instanceState,globalStartTime)',
      );
      return await result.json();
    }),
  );

  return deployments
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result.status === 'fulfilled' ? result.value : null))
    .flat(1) as DeployedProcessInfo[];
}
