export const jsKeys = [
  {
    name: 'js.allowCapabilityExecution',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'js.allowedCapabilities',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'js.deniedCapabilities',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'js.allowInternalLibraries',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'js.allowedInternalLibraries',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'js.deniedInternalLibraries',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'js.allowExternalLibraries',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'js.allowedExternalLibraries',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'js.deniedExternalLibraries',
    valueType: 'Array',
    default: [],
  },
];

export const routerKeys = [
  {
    name: 'router.selectionAlgorithm',
    valueType: 'String',
    default: 'random',
  },
  {
    name: 'router.softConstraintPolicy',
    valueType: 'String',
    default: 'FlowNode',
  },
  {
    name: 'router.scPolicyAsFastAsPossible',
    valueType: 'Array',
    default: ['machine.cpu.currentLoad', 'machine.mem.load'],
  },
  {
    name: 'router.waitTimeExternalEvaluations',
    valueType: 'Number',
    default: 5000,
  },
  {
    name: 'router.reEvaluateTimer',
    valueType: 'Number',
    default: 15000,
  },
  {
    name: 'router.maxStorageTime',
    valueType: 'Number',
    default: 2592000,
  },
  {
    name: 'router.maxStorageRounds',
    valueType: 'Number',
    default: -1,
  },
];

export const processKeys = [
  {
    name: 'process.maxTimeProcessGlobal',
    valueType: 'Number',
    default: -1,
  },
  {
    name: 'process.maxTimeProcessLocal',
    valueType: 'Number',
    default: -1,
  },
  {
    name: 'process.maxTimeFlowNode',
    valueType: 'Number',
    default: -1,
  },
  {
    name: 'process.runUntrustedCode',
    valueType: 'Boolean',
    default: false,
  },
  {
    name: 'process.deniedBPMNElements',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'process.acceptedProcesses',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'process.deniedProcesses',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'process.allowProcessesCreatedInExtEnvs',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'process.acceptedProcessesCreatedInEnvs',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'process.deniedProcessesCreatedInEnvs',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'process.allowProcessesFromExtMachines',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'process.acceptedProcessesFromMachineEnvs',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'process.deniedProcessesFromMachineEnvs',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'process.acceptedProcessesFromMachines',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'process.deniedProcessesFromMachines',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'process.allowProcessesToExtMachines',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'process.acceptedProcessesToMachinesEnvs',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'process.deniedProcessesToMachinesEnvs',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'process.acceptedProcessesToMachines',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'process.deniedProcessesToMachines',
    valueType: 'Array',
    default: [],
  },
];

export const machineKeys = [
  {
    name: 'machine.maxCPULoad',
    valueType: 'Number',
    default: 100,
  },
  {
    name: 'machine.maxMemLoad',
    valueType: 'Number',
    default: 100,
  },
  {
    name: 'machine.port',
    valueType: 'Number',
    default: 8080,
  },
  {
    name: 'machine.env.offline',
    valueType: 'Boolean',
    default: false,
  },
  {
    name: 'machine.env.allowedConnections',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'machine.env.deniedConnections',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'machine.env.reachableMachines',
    valueType: 'Array',
    default: [],
  },
  {
    name: 'machine.env.reachableMachinesTimeout',
    valueType: 'Number',
    default: 300,
  },
  {
    name: 'machine.env.allowSCValuesForHomeEnv',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'machine.env.allowSCValuesForExtEnv',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'machine.env.allowedToWorkInsideExtEnvs',
    valueType: 'Boolean',
    default: true,
  },
  {
    name: 'machine.env.acceptedEnvsToWorkIn',
    valueType: 'Array',
    default: ['*'],
  },
  {
    name: 'machine.env.deniedEnvsToWorkIn',
    valueType: 'Array',
    default: [],
  },
];
