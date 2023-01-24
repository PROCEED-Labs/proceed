/* Constraint Data Structure:
 * {
 *   name: string (name of the constraint)
 *   valueType: data type of the value given to the constraint
 *   units?: optional array of strings that contains possible units of a constraint value
 *   description?: optional description displayed for the user
 * }
 * */
const units = {
  storageUnits: ['Bytes', 'MB', 'GB', 'TB'],
  timeUnits: ['s', 'min', 'hour', 'day'],
  frequencyUnits: ['Hz', 'MHz', 'GHz'],
};
// These constraints are to be used on task and process level:
export const constraints = [
  {
    name: 'machine.id',
    units: ['UUID'],
    valueType: 'String',
  },
  {
    name: 'machine.name',
    valueType: 'String',
  },
  {
    name: 'machine.hostname',
    valueType: 'String',
  },
  {
    name: 'machine.classes',
    valueType: 'String',
    values: ['Portable', 'Static'],
  },
  {
    name: 'machine.inputs',
    valueType: 'String',
    values: ['TouchScreen', 'Microphone', 'SpeechRecognition', 'Keyboard', 'Numpad', 'Camera'],
  },
  {
    name: 'machine.outputs',
    valueType: 'String',
    values: ['Screen', 'Audio'],
  },
  {
    name: 'machine.os.platform',
    valueType: 'String',
  },
  {
    name: 'machine.os.distro',
    valueType: 'String',
  },
  {
    name: 'machine.os.release',
    valueType: 'String',
  },
  {
    name: 'machine.cpu.cores',
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.physicalCores',
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.processors',
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.speed',
    units: units.frequencyUnits,
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.currentLoad',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.loadLastMinute',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.loadLastTenMinutes',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.loadLastHalfHour',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.loadLastHour',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.loadLastHalfDay',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.cpu.loadLastDay',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.mem.total',
    units: units.storageUnits,
    valueType: 'Number',
  },
  {
    name: 'machine.mem.free',
    units: units.storageUnits,
    valueType: 'Number',
  },
  {
    name: 'machine.mem.load',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.disk.type',
    valueType: 'String',
  },
  {
    name: 'machine.disk.total',
    units: units.storageUnits,
    valueType: 'Number',
  },
  {
    name: 'machine.disk.free',
    units: units.storageUnits,
    valueType: 'Number',
  },
  {
    name: 'machine.disk.used',
    units: ['%'],
    valueType: 'Number',
  },
  {
    name: 'machine.battery.hasBattery',
    valueType: 'Boolean',
  },
  {
    name: 'machine.battery.percent',
    valueType: 'Number',
  },
  {
    name: 'machine.battery.maxCapacity',
    valueType: 'Number',
  },
  {
    name: 'machine.battery.isCharging',
    valueType: 'Boolean',
  },
  {
    name: 'machine.battery.timeRemaining',
    valueType: 'Number',
    units: units.timeUnits,
  },
  {
    name: 'machine.battery.acconnected',
    valueType: 'Boolean',
  },
  {
    name: 'machine.display.currentResX',
    valueType: 'Number',
  },
  {
    name: 'machine.display.currentResY',
    valueType: 'Number',
  },
  {
    name: 'machine.online',
    valueType: 'Boolean',
  },
  {
    name: 'machine.possibleConnectionTo',
    valueType: 'String',
    latency: {
      name: 'latency',
      valueType: 'Number',
      units: units.timeUnits,
    },
  },
  {
    name: 'machine.network.type',
    valueType: 'String',
  },
  {
    name: 'machine.network.ip4',
    valueType: 'String',
  },
  {
    name: 'machine.network.ip6',
    valueType: 'String',
  },
  {
    name: 'machine.network.mac',
    valueType: 'String',
  },
  {
    name: 'machine.network.netmaskv4',
    valueType: 'String',
  },
  {
    name: 'machine.network.netmaskv6',
    valueType: 'String',
  },
  // {
  //   name: 'machine.wifi.ssid',
  //   valueType: 'String',
  // },
  // {
  //   name: 'machine.wifi.bssid',
  //   valueType: 'String',
  // },
  // {
  //   name: 'machine.wifi.signalLevel',
  //   valueType: 'Number',
  // },
  // {
  //   name: 'machine.wifi.quality',
  //   valueType: 'Number',
  // },
  // {
  //   name: 'machine.wifi.security',
  //   valueType: 'String',
  // },
  {
    name: 'machine.homeEnvironment',
    valueType: 'String',
  },
  {
    name: 'machine.currentEnvironment',
    valueType: 'String',
  },
  {
    name: 'machine.domain',
    valueType: 'String',
  },
  {
    name: 'user.name',
    valueType: 'String',
  },
  {
    name: 'user.id',
    valueType: 'Number',
  },
  {
    name: 'user.role',
    valueType: 'String',
  },
  {
    name: 'sameMachine',
    valueType: 'Boolean',
  },
  {
    name: 'maxTime',
    units: units.timeUnits,
    valueType: 'Number',
  },
  {
    name: 'maxTimeGlobal',
    units: units.timeUnits,
    valueType: 'Number',
  },
  {
    name: 'maxTokenStorageTime',
    units: units.timeUnits,
    valueType: 'Number',
  },
  {
    name: 'maxTokenStorageRounds',
    valueType: 'Number',
  },
  {
    name: 'maxMachineHops',
    valueType: 'Number',
  },
];
export const softConstraints = [
  'machine.cpu.cores',
  'machine.cpu.physicalCores',
  'machine.cpu.processors',
  'machine.cpu.speed',
  'machine.cpu.currentLoad',
  'machine.cpu.loadLastMinute',
  'machine.cpu.loadLastTenMinutes',
  'machine.cpu.loadLastHalfHour',
  'machine.cpu.loadLastHour',
  'machine.cpu.loadLastHalfDay',
  'machine.cpu.loadLastDay',
  'machine.mem.total',
  'machine.mem.free',
  'machine.mem.load',
  'machine.disk.total',
  'machine.disk.free',
  'machine.disk.used',
  'machine.battery.percent',
  'machine.battery.maxCapacity',
  'machine.display.currentResX',
  'machine.display.currentResY',
  //  'machine.wifi.signalLevel',
  //  'machine.wifi.quality',
];

export const conditions = {
  hard: {
    comparative: ['>', '>=', '<=', '<'],
    exact: ['==', '!='],
  },
  soft: ['min', 'max'],
};
