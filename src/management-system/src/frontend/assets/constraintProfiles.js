/**
 * All predefined profiles (sets of constraints) go here.
 * @type {Object}
 */

// process has to executed on the device itself if possible, but at least within the same IP group/environment
// export const local = {
//   name: 'local',
//   description: 'within the same IP range',
//   constraints: [
//     {
//       name: 'isNextTo',
//       condition: '==',
//       unit: 'subIP',
//       value: 'machine.network.subIP',
//     },
//   ],
// };

// process should be executed as fast as possible, therefore performant devices should be chosen
export const performance = {
  name: 'performance',
  description: 'maximize RAM, maximize CPU speed and cores',
  processConstraints: {
    softConstraints: [
      {
        _type: 'softConstraint',
        _attributes: {
          weight: 10,
        },
        name: 'machine.cpu.speed',
        condition: 'max',
      },
      {
        _type: 'softConstraint',
        _attributes: {
          weight: 10,
        },
        name: 'machine.cpu.cores',
        condition: 'max',
      },
      {
        _type: 'softConstraint',
        _attributes: {
          weight: 10,
        },
        name: 'machine.mem.free',
        condition: 'max',
      },
    ],
    hardConstraints: [],
  },
};

export const environmentPerformance = {
  name: 'performance',
  description: 'minimize CPU and Memory load',
  constraints: [
    {
      name: 'machine.maxCPULoad',
      condition: '==',
      value: '50',
      unit: '%',
    },
    {
      name: 'machine.maxMemLoad',
      condition: '==',
      value: '50',
      unit: '%',
    },
  ],
};
