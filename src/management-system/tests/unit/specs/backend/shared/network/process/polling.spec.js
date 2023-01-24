import {
  mergeDeployments,
  mergeInstanceInformation,
} from '../../../../../../../src/backend/shared-electron-server/network/process/polling.js';

describe('Tests for the deployment polling module', () => {
  const machine1 = { id: 'machine1', ip: '123', port: 123 };
  const machine2 = { id: 'machine2', ip: '456', port: 456 };
  describe('mergeDeployments()', () => {
    it('creates an object containing the different deployments from all machines', () => {
      expect(
        mergeDeployments(undefined, [
          [
            machine1,
            {
              deployment1: {
                definitionId: 'deployment1',
                versions: [],
                instances: [],
                runningInstances: [],
              },
            },
          ],
          [
            machine2,
            {
              deployment2: {
                definitionId: 'deployment2',
                versions: [],
                instances: [],
                runningInstances: [],
              },
            },
          ],
        ])
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1],
            versions: [],
            instances: {},
            runningInstances: {},
          },
          deployment2: {
            definitionId: 'deployment2',
            machines: [machine2],
            versions: [],
            instances: {},
            runningInstances: {},
          },
        },
        removedDeployments: [],
      });
    });
    it('merges the information of deployments that are on multiple machines', () => {
      expect(
        mergeDeployments(undefined, [
          [
            machine1,
            {
              deployment1: {
                definitionId: 'deployment1',
                versions: [],
                instances: [],
                runningInstances: [],
              },
            },
          ],
          [
            machine2,
            {
              deployment1: {
                definitionId: 'deployment1',
                versions: [],
                instances: [],
                runningInstances: [],
              },
              deployment2: {
                definitionId: 'deployment2',
                versions: [],
                instances: [],
                runningInstances: [],
              },
            },
          ],
        ])
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1, machine2],
            versions: [],
            instances: {},
            runningInstances: {},
          },
          deployment2: {
            definitionId: 'deployment2',
            machines: [machine2],
            versions: [],
            instances: {},
            runningInstances: {},
          },
        },
        removedDeployments: [],
      });
    });

    it('merges the version information of a process that resides on multiple machines', () => {
      expect(
        mergeDeployments(undefined, [
          [
            machine1,
            {
              deployment1: {
                definitionId: 'deployment1',
                versions: [
                  {
                    version: 10,
                    versionDescription: 'Some Description',
                    versionName: 'Some Name',
                    deploymentDate: 200,
                    bpmn: 'Some BPMN',
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_B'],
                    },
                  },
                  {
                    version: 22,
                    versionDescription: 'Other Description',
                    versionName: 'Other Name',
                    deploymentDate: 435,
                    bpmn: 'Other BPMN',
                    needs: {
                      html: ['HTML_A', 'HTML_B'],
                      imports: ['IMPORT_B'],
                    },
                  },
                ],
                instances: [],
                runningInstances: [],
              },
            },
          ],
          [
            machine2,
            {
              deployment1: {
                definitionId: 'deployment1',
                versions: [
                  {
                    version: 10,
                    versionDescription: 'Some Description',
                    versionName: 'Some Name',
                    deploymentDate: 246,
                    bpmn: 'Some BPMN',
                    needs: {
                      html: ['HTML_B'],
                      imports: [],
                    },
                  },
                  {
                    version: 33,
                    versionDescription: 'Another description',
                    versionName: 'Another name',
                    deploymentDate: 598,
                    bpmn: 'Another BPMN',
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_A', 'IMPORT_B'],
                    },
                  },
                ],
                instances: [],
                runningInstances: [],
              },
              deployment2: {
                definitionId: 'deployment2',
                versions: [
                  {
                    version: 56,
                    versionDescription: 'Description',
                    versionName: 'Name',
                    deploymentDate: 943,
                    bpmn: 'BPMN',
                    needs: {
                      html: [],
                      imports: [],
                    },
                  },
                ],
                instances: [],
                runningInstances: [],
              },
            },
          ],
        ])
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1, machine2],
            versions: [
              {
                version: 10,
                versionDescription: 'Some Description',
                versionName: 'Some Name',
                bpmn: 'Some BPMN',
                machines: [
                  {
                    machineId: 'machine1',
                    deploymentDate: 200,
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_B'],
                    },
                  },
                  {
                    machineId: 'machine2',
                    deploymentDate: 246,
                    needs: {
                      html: ['HTML_B'],
                      imports: [],
                    },
                  },
                ],
              },
              {
                version: 22,
                versionDescription: 'Other Description',
                versionName: 'Other Name',
                bpmn: 'Other BPMN',
                machines: [
                  {
                    machineId: 'machine1',
                    deploymentDate: 435,
                    needs: {
                      html: ['HTML_A', 'HTML_B'],
                      imports: ['IMPORT_B'],
                    },
                  },
                ],
              },
              {
                version: 33,
                versionDescription: 'Another description',
                versionName: 'Another name',
                bpmn: 'Another BPMN',
                machines: [
                  {
                    machineId: 'machine2',
                    deploymentDate: 598,
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_A', 'IMPORT_B'],
                    },
                  },
                ],
              },
            ],
            instances: {},
            runningInstances: {},
          },
          deployment2: {
            definitionId: 'deployment2',
            machines: [machine2],
            versions: [
              {
                version: 56,
                versionDescription: 'Description',
                versionName: 'Name',
                bpmn: 'BPMN',
                machines: [
                  {
                    machineId: 'machine2',
                    deploymentDate: 943,
                    needs: {
                      html: [],
                      imports: [],
                    },
                  },
                ],
              },
            ],
            instances: {},
            runningInstances: {},
          },
        },
        removedDeployments: [],
      });
    });

    it('merges the deployment entries about instances that are known on multiple machines', () => {
      expect(
        mergeDeployments(undefined, [
          [
            machine1,
            {
              deployment1: {
                definitionId: 'deployment1',
                versions: [],
                instances: [
                  {
                    processInstanceId: 'instance1',
                    processVersion: 10,
                    globalStartTime: 2000,
                    instanceState: ['ENDED'],
                  },
                  {
                    processInstanceId: 'instance2',
                    processVersion: 10,
                    globalStartTime: 5000,
                    instanceState: ['RUNNING'],
                  },
                ],
              },
            },
          ],
          [
            machine2,
            {
              deployment1: {
                definitionId: 'deployment1',
                versions: [],
                instances: [
                  {
                    processInstanceId: 'instance2',
                    processVersion: 10,
                    globalStartTime: 5000,
                    instanceState: ['FORWARDED'],
                  },
                  {
                    processInstanceId: 'instance3',
                    processVersion: 10,
                    globalStartTime: 6000,
                    instanceState: ['RUNNING'],
                  },
                ],
              },
              deployment2: {
                definitionId: 'deployment2',
                versions: [],
                instances: [
                  {
                    processInstanceId: 'instance1',
                    processVersion: 15,
                    globalStartTime: 3500,
                    instanceState: ['RUNNING'],
                  },
                ],
              },
            },
          ],
        ])
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1, machine2],
            versions: [],
            instances: {
              instance1: {
                processInstanceId: 'instance1',
                processVersion: 10,
                globalStartTime: 2000,
                machines: ['machine1'],
              },
              instance2: {
                processInstanceId: 'instance2',
                processVersion: 10,
                globalStartTime: 5000,
                machines: ['machine1', 'machine2'],
              },
              instance3: {
                processInstanceId: 'instance3',
                processVersion: 10,
                globalStartTime: 6000,
                machines: ['machine2'],
              },
            },
            runningInstances: { instance2: ['machine1'], instance3: ['machine2'] },
          },
          deployment2: {
            definitionId: 'deployment2',
            machines: [machine2],
            versions: [],
            instances: {
              instance1: {
                processInstanceId: 'instance1',
                processVersion: 15,
                globalStartTime: 3500,
                machines: ['machine2'],
              },
            },
            runningInstances: { instance1: ['machine2'] },
          },
        },
        removedDeployments: [],
      });
    });

    it('will remove a machine from the list of a runningInstance if the instance is not active on the machine anymore', () => {
      expect(
        mergeDeployments(
          {
            deployment1: {
              definitionId: 'deployment1',
              machines: [machine1],
              versions: [],
              instances: {
                instance1: {
                  processInstanceId: 'instance1',
                  processVersion: 10,
                  globalStartTime: 2000,
                  machines: ['machine1', 'machine2'],
                },
              },
              runningInstances: { instance1: ['machine1', 'machine2'] },
            },
          },
          [
            [
              machine1,
              {
                deployment1: {
                  definitionId: 'deployment1',
                  versions: [],
                  instances: [
                    {
                      processInstanceId: 'instance1',
                      processVersion: 10,
                      globalStartTime: 2000,
                      instanceState: ['RUNNING'],
                    },
                  ],
                },
              },
            ],
            [
              machine2,
              {
                deployment1: {
                  definitionId: 'deployment1',
                  versions: [],
                  instances: [
                    {
                      processInstanceId: 'instance1',
                      processVersion: 10,
                      globalStartTime: 2000,
                      instanceState: ['FORWARDED', 'ENDED'],
                    },
                  ],
                },
              },
            ],
          ]
        )
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1, machine2],
            versions: [],
            instances: {
              instance1: {
                processInstanceId: 'instance1',
                processVersion: 10,
                globalStartTime: 2000,
                machines: ['machine1', 'machine2'],
              },
            },
            runningInstances: { instance1: ['machine1'] },
          },
        },
        removedDeployments: [],
      });
    });

    it('will remove an instance from the list of active instances if it is not running on any known machine', () => {
      expect(
        mergeDeployments(
          {
            deployment1: {
              definitionId: 'deployment1',
              machines: [machine1, machine2],
              versions: [],
              instances: {
                instance1: {
                  processInstanceId: 'instance1',
                  processVersion: 10,
                  globalStartTime: 2000,
                  machines: ['machine1', 'machine2'],
                },
              },
              runningInstances: { instance1: ['machine1'] },
            },
          },
          [
            [
              machine1,
              {
                deployment1: {
                  definitionId: 'deployment1',
                  versions: [],
                  instances: [
                    {
                      processInstanceId: 'instance1',
                      processVersion: 10,
                      globalStartTime: 2000,
                      instanceState: ['ENDED'],
                    },
                  ],
                },
              },
            ],
            [
              machine2,
              {
                deployment1: {
                  definitionId: 'deployment1',
                  versions: [],
                  instances: [
                    {
                      processInstanceId: 'instance1',
                      processVersion: 10,
                      globalStartTime: 2000,
                      instanceState: ['FORWARDED', 'ENDED'],
                    },
                  ],
                },
              },
            ],
          ]
        )
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1, machine2],
            versions: [],
            instances: {
              instance1: {
                processInstanceId: 'instance1',
                processVersion: 10,
                globalStartTime: 2000,
                machines: ['machine1', 'machine2'],
              },
            },
            runningInstances: {},
          },
        },
        removedDeployments: [],
      });
    });

    it('will not add machine information again if it is already part of the known deployment data', () => {
      expect(
        mergeDeployments(
          {
            deployment1: {
              definitionId: 'deployment1',
              machines: [machine1, machine2],
              versions: [
                {
                  version: 10,
                  versionDescription: 'Some Description',
                  versionName: 'Some Name',
                  bpmn: 'Some BPMN',
                  machines: [
                    {
                      machineId: 'machine1',
                      deploymentDate: 200,
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_B'],
                      },
                    },
                    {
                      machineId: 'machine2',
                      deploymentDate: 246,
                      needs: {
                        html: ['HTML_B'],
                        imports: [],
                      },
                    },
                  ],
                },
                {
                  version: 22,
                  versionDescription: 'Other Description',
                  versionName: 'Other Name',
                  bpmn: 'Other BPMN',
                  machines: [
                    {
                      machineId: 'machine1',
                      deploymentDate: 435,
                      needs: {
                        html: ['HTML_A', 'HTML_B'],
                        imports: ['IMPORT_B'],
                      },
                    },
                  ],
                },
                {
                  version: 33,
                  versionDescription: 'Another description',
                  versionName: 'Another name',
                  bpmn: 'Another BPMN',
                  machines: [
                    {
                      machineId: 'machine2',
                      deploymentDate: 598,
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_A', 'IMPORT_B'],
                      },
                    },
                  ],
                },
              ],

              instances: {
                instance1: {
                  processInstanceId: 'instance1',
                  processVersion: 10,
                  globalStartTime: 2000,
                  machines: ['machine1', 'machine2'],
                },
              },
              runningInstances: { instance1: ['machine2'] },
              // TODO
              // instances: {
              //   instance1: {
              //     processInstanceId: 'instance1',
              //     processVersion: 10,
              //     instanceState: ['RUNNING'],
              //     tokens: [
              //       {
              //         tokenId: 'abc',
              //         state: 'RUNNING',
              //         machineId: 'machine2',
              //         machineHops: 1,
              //       },
              //     ],
              //     log: [],
              //     adaptationLog: [],
              //     variables: {},
              //     stillBeingExecutedOnMachines: { machine1: false, machine2: true },
              //   },
              // },
            },
            deployment2: {
              definitionId: 'deployment2',
              machines: [machine2],
              versions: [
                {
                  version: 56,
                  versionDescription: 'Description',
                  versionName: 'Name',
                  bpmn: 'BPMN',
                  machines: [
                    {
                      machineId: 'machine2',
                      deploymentDate: 943,
                      needs: {
                        html: [],
                        imports: [],
                      },
                    },
                  ],
                },
              ],
              instances: {},
              runningInstances: {},
            },
          },
          [
            [
              machine1,
              {
                deployment1: {
                  definitionId: 'deployment1',
                  versions: [
                    {
                      version: 10,
                      versionDescription: 'Some Description',
                      versionName: 'Some Name',
                      deploymentDate: 200,
                      bpmn: 'Some BPMN',
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_B'],
                      },
                    },
                    {
                      version: 22,
                      versionDescription: 'Other Description',
                      versionName: 'Other Name',
                      deploymentDate: 435,
                      bpmn: 'Other BPMN',
                      needs: {
                        html: ['HTML_A', 'HTML_B'],
                        imports: ['IMPORT_B'],
                      },
                    },
                  ],

                  instances: [
                    {
                      processInstanceId: 'instance1',
                      processVersion: 10,
                      globalStartTime: 2000,
                      instanceState: ['FOWARDED', 'ENDED'],
                    },
                  ],
                  // TODO
                  // instances: [
                  //   {
                  //     processInstanceId: 'instance1',
                  //     processVersion: 10,
                  //     instanceState: ['FORWARDED'],
                  //     tokens: [
                  //       {
                  //         tokenId: 'abc',
                  //         state: 'FORWARDED',
                  //         machineHops: 0,
                  //       },
                  //     ],
                  //     log: [],
                  //     adaptationLog: [],
                  //     variables: {},
                  //     isCurrentlyExecutedInBpmnEngine: false,
                  //   },
                  // ],
                },
              },
            ],
            [
              machine2,
              {
                deployment1: {
                  definitionId: 'deployment1',
                  versions: [
                    {
                      version: 10,
                      versionDescription: 'Some Description',
                      versionName: 'Some Name',
                      deploymentDate: 246,
                      bpmn: 'Some BPMN',
                      needs: {
                        html: ['HTML_B'],
                        imports: [],
                      },
                    },
                    {
                      version: 33,
                      versionDescription: 'Another description',
                      versionName: 'Another name',
                      deploymentDate: 598,
                      bpmn: 'Another BPMN',
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_A', 'IMPORT_B'],
                      },
                    },
                  ],

                  instances: [
                    {
                      processInstanceId: 'instance1',
                      processVersion: 10,
                      globalStartTime: 2000,
                      instanceState: ['RUNNING'],
                    },
                  ],
                  // TODO
                  // instances: [
                  //   {
                  //     processInstanceId: 'instance1',
                  //     processVersion: 10,
                  //     instanceState: ['RUNNING'],
                  //     tokens: [
                  //       {
                  //         tokenId: 'abc',
                  //         state: 'RUNNING',
                  //         machineHops: 1,
                  //       },
                  //     ],
                  //     log: [],
                  //     adaptationLog: [],
                  //     variables: {},
                  //     isCurrentlyExecutedInBpmnEngine: true,
                  //   },
                  // ],
                },
                deployment2: {
                  definitionId: 'deployment2',
                  versions: [
                    {
                      version: 56,
                      versionDescription: 'Description',
                      versionName: 'Name',
                      deploymentDate: 943,
                      bpmn: 'BPMN',
                      needs: {
                        html: [],
                        imports: [],
                      },
                    },
                  ],
                  instances: [],
                },
              },
            ],
          ]
        )
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1, machine2],
            versions: [
              {
                version: 10,
                versionDescription: 'Some Description',
                versionName: 'Some Name',
                bpmn: 'Some BPMN',
                machines: [
                  {
                    machineId: 'machine1',
                    deploymentDate: 200,
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_B'],
                    },
                  },
                  {
                    machineId: 'machine2',
                    deploymentDate: 246,
                    needs: {
                      html: ['HTML_B'],
                      imports: [],
                    },
                  },
                ],
              },
              {
                version: 22,
                versionDescription: 'Other Description',
                versionName: 'Other Name',
                bpmn: 'Other BPMN',
                machines: [
                  {
                    machineId: 'machine1',
                    deploymentDate: 435,
                    needs: {
                      html: ['HTML_A', 'HTML_B'],
                      imports: ['IMPORT_B'],
                    },
                  },
                ],
              },
              {
                version: 33,
                versionDescription: 'Another description',
                versionName: 'Another name',
                bpmn: 'Another BPMN',
                machines: [
                  {
                    machineId: 'machine2',
                    deploymentDate: 598,
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_A', 'IMPORT_B'],
                    },
                  },
                ],
              },
            ],
            instances: {
              instance1: {
                processInstanceId: 'instance1',
                processVersion: 10,
                globalStartTime: 2000,
                machines: ['machine1', 'machine2'],
              },
            },
            runningInstances: { instance1: ['machine2'] },
            // TODO
            // instances: {
            //   instance1: {
            //     processInstanceId: 'instance1',
            //     processVersion: 10,
            //     instanceState: ['RUNNING'],
            //     tokens: [
            //       {
            //         tokenId: 'abc',
            //         state: 'RUNNING',
            //         machineId: 'machine2',
            //         machineHops: 1,
            //       },
            //     ],
            //     log: [],
            //     adaptationLog: [],
            //     variables: {},
            //     stillBeingExecutedOnMachines: { machine1: false, machine2: true },
            //   },
            // },
          },
          deployment2: {
            definitionId: 'deployment2',
            machines: [machine2],
            versions: [
              {
                version: 56,
                versionDescription: 'Description',
                versionName: 'Name',
                bpmn: 'BPMN',
                machines: [
                  {
                    machineId: 'machine2',
                    deploymentDate: 943,
                    needs: {
                      html: [],
                      imports: [],
                    },
                  },
                ],
              },
            ],
            instances: {},
            runningInstances: {},
          },
        },
        removedDeployments: [],
      });
    });

    it('will not remove information if information from a specific machine can not be requested at the moment', () => {
      expect(
        mergeDeployments(
          {
            deployment1: {
              definitionId: 'deployment1',
              machines: [machine1, machine2],
              versions: [
                {
                  version: 10,
                  versionDescription: 'Some Description',
                  versionName: 'Some Name',
                  bpmn: 'Some BPMN',
                  machines: [
                    {
                      machineId: 'machine1',
                      deploymentDate: 200,
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_B'],
                      },
                    },
                    {
                      machineId: 'machine2',
                      deploymentDate: 246,
                      needs: {
                        html: ['HTML_B'],
                        imports: [],
                      },
                    },
                  ],
                },
                {
                  version: 22,
                  versionDescription: 'Other Description',
                  versionName: 'Other Name',
                  bpmn: 'Other BPMN',
                  machines: [
                    {
                      machineId: 'machine1',
                      deploymentDate: 435,
                      needs: {
                        html: ['HTML_A', 'HTML_B'],
                        imports: ['IMPORT_B'],
                      },
                    },
                  ],
                },
                {
                  version: 33,
                  versionDescription: 'Another description',
                  versionName: 'Another name',
                  bpmn: 'Another BPMN',
                  machines: [
                    {
                      machineId: 'machine2',
                      deploymentDate: 598,
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_A', 'IMPORT_B'],
                      },
                    },
                  ],
                },
              ],
              instances: {
                instance1: {
                  processInstanceId: 'instance1',
                  processVersion: 10,
                  globalStartTime: 2000,
                  machines: ['machine1', 'machine2'],
                },
              },
              runningInstances: { instance1: ['machine2'] },
              // TODO
              // instances: {
              //   instance1: {
              //     processInstanceId: 'instance1',
              //     processVersion: 10,
              //     instanceState: ['ENDED', 'RUNNING'],
              //     tokens: [
              //       {
              //         tokenId: 'def',
              //         state: 'ENDED',
              //         machineId: 'machine1',
              //         machineHops: 0,
              //       },
              //       {
              //         tokenId: 'abc',
              //         state: 'RUNNING',
              //         machineId: 'machine2',
              //         machineHops: 1,
              //       },
              //     ],
              //     log: [],
              //     adaptationLog: [],
              //     variables: {},
              //     stillBeingExecutedOnMachines: { machine1: false, machine2: true },
              //   },
              // },
            },
            deployment2: {
              definitionId: 'deployment2',
              machines: [machine2],
              versions: [
                {
                  version: 56,
                  versionDescription: 'Description',
                  versionName: 'Name',
                  bpmn: 'BPMN',
                  machines: [
                    {
                      machineId: 'machine2',
                      deploymentDate: 943,
                      needs: {
                        html: [],
                        imports: [],
                      },
                    },
                  ],
                },
              ],
              instances: {},
              runningInstances: {},
            },
          },
          [
            [
              machine2,
              {
                deployment1: {
                  definitionId: 'deployment1',
                  versions: [
                    {
                      version: 10,
                      versionDescription: 'Some Description',
                      versionName: 'Some Name',
                      deploymentDate: 246,
                      bpmn: 'Some BPMN',
                      needs: {
                        html: ['HTML_B'],
                        imports: [],
                      },
                    },
                    {
                      version: 33,
                      versionDescription: 'Another description',
                      versionName: 'Another name',
                      deploymentDate: 598,
                      bpmn: 'Another BPMN',
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_A', 'IMPORT_B'],
                      },
                    },
                  ],
                  instances: [
                    {
                      processInstanceId: 'instance1',
                      processVersion: 10,
                      globalStartTime: 2000,
                      instanceState: ['RUNNING'],
                    },
                  ],
                  // TODO
                  // instances: [
                  //   {
                  //     processInstanceId: 'instance1',
                  //     processVersion: 10,
                  //     instanceState: ['RUNNING'],
                  //     tokens: [
                  //       {
                  //         tokenId: 'abc',
                  //         state: 'RUNNING',
                  //         machineHops: 1,
                  //       },
                  //     ],
                  //     log: [],
                  //     adaptationLog: [],
                  //     variables: {},
                  //     isCurrentlyExecutedInBpmnEngine: true,
                  //   },
                  // ],
                },
                deployment2: {
                  definitionId: 'deployment2',
                  versions: [
                    {
                      version: 56,
                      versionDescription: 'Description',
                      versionName: 'Name',
                      deploymentDate: 943,
                      bpmn: 'BPMN',
                      needs: {
                        html: [],
                        imports: [],
                      },
                    },
                  ],
                  instances: [],
                },
              },
            ],
          ]
        )
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1, machine2],
            versions: [
              {
                version: 10,
                versionDescription: 'Some Description',
                versionName: 'Some Name',
                bpmn: 'Some BPMN',
                machines: [
                  {
                    machineId: 'machine1',
                    deploymentDate: 200,
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_B'],
                    },
                  },
                  {
                    machineId: 'machine2',
                    deploymentDate: 246,
                    needs: {
                      html: ['HTML_B'],
                      imports: [],
                    },
                  },
                ],
              },
              {
                version: 22,
                versionDescription: 'Other Description',
                versionName: 'Other Name',
                bpmn: 'Other BPMN',
                machines: [
                  {
                    machineId: 'machine1',
                    deploymentDate: 435,
                    needs: {
                      html: ['HTML_A', 'HTML_B'],
                      imports: ['IMPORT_B'],
                    },
                  },
                ],
              },
              {
                version: 33,
                versionDescription: 'Another description',
                versionName: 'Another name',
                bpmn: 'Another BPMN',
                machines: [
                  {
                    machineId: 'machine2',
                    deploymentDate: 598,
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_A', 'IMPORT_B'],
                    },
                  },
                ],
              },
            ],
            // TODO
            instances: {
              instance1: {
                processInstanceId: 'instance1',
                processVersion: 10,
                globalStartTime: 2000,
                machines: ['machine1', 'machine2'],
              },
            },
            runningInstances: { instance1: ['machine2'] },
            // instances: {
            //   instance1: {
            //     processInstanceId: 'instance1',
            //     processVersion: 10,
            //     instanceState: ['ENDED', 'RUNNING'],
            //     tokens: [
            //       {
            //         tokenId: 'def',
            //         state: 'ENDED',
            //         machineId: 'machine1',
            //         machineHops: 0,
            //       },
            //       {
            //         tokenId: 'abc',
            //         state: 'RUNNING',
            //         machineId: 'machine2',
            //         machineHops: 1,
            //       },
            //     ],
            //     log: [],
            //     adaptationLog: [],
            //     variables: {},
            //     stillBeingExecutedOnMachines: { machine1: false, machine2: true },
            //   },
            // },
          },
          deployment2: {
            definitionId: 'deployment2',
            machines: [machine2],
            versions: [
              {
                version: 56,
                versionDescription: 'Description',
                versionName: 'Name',
                bpmn: 'BPMN',
                machines: [
                  {
                    machineId: 'machine2',
                    deploymentDate: 943,
                    needs: {
                      html: [],
                      imports: [],
                    },
                  },
                ],
              },
            ],
            instances: {},
            runningInstances: {},
          },
        },
        removedDeployments: [],
      });
    });

    it('will remove machine specific information if the machine a deployment was previously found on was removed from the machine', () => {
      expect(
        mergeDeployments(
          {
            deployment1: {
              definitionId: 'deployment1',
              machines: [machine1, machine2],
              versions: [
                {
                  version: 10,
                  versionDescription: 'Some Description',
                  versionName: 'Some Name',
                  bpmn: 'Some BPMN',
                  machines: [
                    {
                      machineId: 'machine1',
                      deploymentDate: 200,
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_B'],
                      },
                    },
                    {
                      machineId: 'machine2',
                      deploymentDate: 246,
                      needs: {
                        html: ['HTML_B'],
                        imports: [],
                      },
                    },
                  ],
                },
                {
                  version: 22,
                  versionDescription: 'Other Description',
                  versionName: 'Other Name',
                  bpmn: 'Other BPMN',
                  machines: [
                    {
                      machineId: 'machine1',
                      deploymentDate: 435,
                      needs: {
                        html: ['HTML_A', 'HTML_B'],
                        imports: ['IMPORT_B'],
                      },
                    },
                  ],
                },
                {
                  version: 33,
                  versionDescription: 'Another description',
                  versionName: 'Another name',
                  bpmn: 'Another BPMN',
                  machines: [
                    {
                      machineId: 'machine2',
                      deploymentDate: 598,
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_A', 'IMPORT_B'],
                      },
                    },
                  ],
                },
              ],

              instances: {
                instance1: {
                  processInstanceId: 'instance1',
                  processVersion: 10,
                  globalStartTime: 2000,
                  machines: ['machine1', 'machine2'],
                },
                instance2: {
                  processInstanceId: 'instance2',
                  processVersion: 10,
                  globalStartTime: 3000,
                  machines: ['machine2'],
                },
                instance3: {
                  processInstanceId: 'instance3',
                  processVersion: 10,
                  globalStartTime: 4000,
                  machines: ['machine1', 'machine2'],
                },
              },
              runningInstances: { instance1: ['machine2'], instance3: ['machine1', 'machine2'] },
            },
            deployment2: {
              definitionId: 'deployment2',
              machines: [machine2],
              versions: [
                {
                  version: 56,
                  versionDescription: 'Description',
                  versionName: 'Name',
                  bpmn: 'BPMN',
                  machines: [
                    {
                      machineId: 'machine2',
                      deploymentDate: 943,
                      needs: {
                        html: [],
                        imports: [],
                      },
                    },
                  ],
                },
              ],
              instances: {},
              runningInstances: {},
            },
          },
          [
            [
              machine1,
              {
                deployment1: {
                  definitionId: 'deployment1',
                  versions: [
                    {
                      version: 10,
                      versionDescription: 'Some Description',
                      versionName: 'Some Name',
                      deploymentDate: 200,
                      bpmn: 'Some BPMN',
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_B'],
                      },
                    },
                    {
                      version: 22,
                      versionDescription: 'Other Description',
                      versionName: 'Other Name',
                      deploymentDate: 435,
                      bpmn: 'Other BPMN',
                      needs: {
                        html: ['HTML_A', 'HTML_B'],
                        imports: ['IMPORT_B'],
                      },
                    },
                  ],

                  instances: [
                    {
                      processInstanceId: 'instance1',
                      processVersion: 10,
                      globalStartTime: 2000,
                      instanceState: ['FOWARDED', 'ENDED'],
                    },
                    {
                      processInstanceId: 'instance3',
                      processVersion: 10,
                      globalStartTime: 4000,
                      instanceState: ['RUNNING', 'FORWARDED'],
                    },
                  ],
                },
              },
            ],
            [
              machine2,
              {
                deployment2: {
                  definitionId: 'deployment2',
                  versions: [
                    {
                      version: 56,
                      versionDescription: 'Description',
                      versionName: 'Name',
                      deploymentDate: 943,
                      bpmn: 'BPMN',
                      needs: {
                        html: [],
                        imports: [],
                      },
                    },
                  ],
                  instances: [],
                },
              },
            ],
          ]
        )
      ).toStrictEqual({
        deployments: {
          deployment1: {
            definitionId: 'deployment1',
            machines: [machine1],
            versions: [
              {
                version: 10,
                versionDescription: 'Some Description',
                versionName: 'Some Name',
                bpmn: 'Some BPMN',
                machines: [
                  {
                    machineId: 'machine1',
                    deploymentDate: 200,
                    needs: {
                      html: ['HTML_A'],
                      imports: ['IMPORT_B'],
                    },
                  },
                ],
              },
              {
                version: 22,
                versionDescription: 'Other Description',
                versionName: 'Other Name',
                bpmn: 'Other BPMN',
                machines: [
                  {
                    machineId: 'machine1',
                    deploymentDate: 435,
                    needs: {
                      html: ['HTML_A', 'HTML_B'],
                      imports: ['IMPORT_B'],
                    },
                  },
                ],
              },
            ],
            instances: {
              instance1: {
                processInstanceId: 'instance1',
                processVersion: 10,
                globalStartTime: 2000,
                machines: ['machine1'],
              },
              instance3: {
                processInstanceId: 'instance3',
                processVersion: 10,
                globalStartTime: 4000,
                machines: ['machine1'],
              },
            },
            runningInstances: { instance3: ['machine1'] },
          },
          deployment2: {
            definitionId: 'deployment2',
            machines: [machine2],
            versions: [
              {
                version: 56,
                versionDescription: 'Description',
                versionName: 'Name',
                bpmn: 'BPMN',
                machines: [
                  {
                    machineId: 'machine2',
                    deploymentDate: 943,
                    needs: {
                      html: [],
                      imports: [],
                    },
                  },
                ],
              },
            ],
            instances: {},
            runningInstances: {},
          },
        },
        removedDeployments: [],
      });
    });

    it('will remove a deployment from the stored list if it was removed from all machines', () => {
      expect(
        mergeDeployments(
          {
            deployment1: {
              definitionId: 'deployment1',
              machines: [machine1, machine2],
              versions: [
                {
                  version: 10,
                  versionDescription: 'Some Description',
                  versionName: 'Some Name',
                  bpmn: 'Some BPMN',
                  machines: [
                    {
                      machineId: 'machine1',
                      deploymentDate: 200,
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_B'],
                      },
                    },
                    {
                      machineId: 'machine2',
                      deploymentDate: 246,
                      needs: {
                        html: ['HTML_B'],
                        imports: [],
                      },
                    },
                  ],
                },
                {
                  version: 22,
                  versionDescription: 'Other Description',
                  versionName: 'Other Name',
                  bpmn: 'Other BPMN',
                  machines: [
                    {
                      machineId: 'machine1',
                      deploymentDate: 435,
                      needs: {
                        html: ['HTML_A', 'HTML_B'],
                        imports: ['IMPORT_B'],
                      },
                    },
                  ],
                },
                {
                  version: 33,
                  versionDescription: 'Another description',
                  versionName: 'Another name',
                  bpmn: 'Another BPMN',
                  machines: [
                    {
                      machineId: 'machine2',
                      deploymentDate: 598,
                      needs: {
                        html: ['HTML_A'],
                        imports: ['IMPORT_A', 'IMPORT_B'],
                      },
                    },
                  ],
                },
              ],

              instances: {
                instance1: {
                  processInstanceId: 'instance1',
                  processVersion: 10,
                  globalStartTime: 2000,
                  machines: ['machine1', 'machine2'],
                },
              },
              runningInstances: { instance1: ['machine2'] },
            },
            deployment2: {
              definitionId: 'deployment2',
              machines: [machine2],
              versions: [
                {
                  version: 56,
                  versionDescription: 'Description',
                  versionName: 'Name',
                  bpmn: 'BPMN',
                  machines: [
                    {
                      machineId: 'machine2',
                      deploymentDate: 943,
                      needs: {
                        html: [],
                        imports: [],
                      },
                    },
                  ],
                },
              ],
              instances: {},
              runningInstances: {},
            },
          },
          [
            [machine1, {}],
            [
              machine2,
              {
                deployment2: {
                  definitionId: 'deployment2',
                  versions: [
                    {
                      version: 56,
                      versionDescription: 'Description',
                      versionName: 'Name',
                      deploymentDate: 943,
                      bpmn: 'BPMN',
                      needs: {
                        html: [],
                        imports: [],
                      },
                    },
                  ],
                  instances: [],
                },
              },
            ],
          ]
        )
      ).toStrictEqual({
        deployments: {
          deployment2: {
            definitionId: 'deployment2',
            machines: [machine2],
            versions: [
              {
                version: 56,
                versionDescription: 'Description',
                versionName: 'Name',
                bpmn: 'BPMN',
                machines: [
                  {
                    machineId: 'machine2',
                    deploymentDate: 943,
                    needs: {
                      html: [],
                      imports: [],
                    },
                  },
                ],
              },
            ],
            instances: {},
            runningInstances: {},
          },
        },
        removedDeployments: ['deployment1'],
      });
    });
  });

  describe('mergeInstanceInformation', () => {
    describe('merging of the log of an instance', () => {
      it('will merge the log entries of an instance from two different machines', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [
                {
                  tokenId: 'abc',
                  startTime: 100,
                  endTime: 102,
                },
              ],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [
                {
                  tokenId: 'abc',
                  startTime: 200,
                  endTime: 202,
                },
              ],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [
            {
              tokenId: 'abc',
              startTime: 100,
              endTime: 102,
            },
            {
              tokenId: 'abc',
              startTime: 200,
              endTime: 202,
            },
          ],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will order the log entries by their endTime', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [
                {
                  tokenId: 'abc',
                  startTime: 300,
                  endTime: 302,
                },
              ],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [
                {
                  tokenId: 'abc',
                  startTime: 200,
                  endTime: 202,
                },
              ],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [
            {
              tokenId: 'abc',
              startTime: 200,
              endTime: 202,
            },
            {
              tokenId: 'abc',
              startTime: 300,
              endTime: 302,
            },
          ],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will not add redundant entries', () => {
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [
                {
                  tokenId: 'abc',
                  startTime: 100,
                  endTime: 102,
                },
              ],
              adaptationLog: [],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: [],
                tokens: [],
                log: [
                  {
                    tokenId: 'abc',
                    startTime: 100,
                    endTime: 102,
                  },
                ],
                adaptationLog: [],
                variables: {},
              },
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: [],
                tokens: [],
                log: [
                  {
                    tokenId: 'abc',
                    startTime: 100,
                    endTime: 102,
                  },
                  {
                    tokenId: 'abc',
                    startTime: 200,
                    endTime: 202,
                  },
                ],
                adaptationLog: [],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [
            {
              tokenId: 'abc',
              startTime: 100,
              endTime: 102,
            },
            {
              tokenId: 'abc',
              startTime: 200,
              endTime: 202,
            },
          ],
          adaptationLog: [],
          variables: {},
        });
      });
    });

    describe('merging of the adaptationLog of an instance', () => {
      it('will merge the adaptationLog entries of an instance from two different machines', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [
                {
                  type: 'TOKEN-MOVE',
                  time: 100,
                },
              ],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [
                {
                  type: 'TOKEN-REMOVE',
                  time: 200,
                },
              ],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [],
          adaptationLog: [
            {
              type: 'TOKEN-MOVE',
              time: 100,
            },
            {
              type: 'TOKEN-REMOVE',
              time: 200,
            },
          ],
          variables: {},
        });
      });

      it('will order the log entries by their endTime', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [
                {
                  type: 'TOKEN-MOVE',
                  time: 300,
                },
              ],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [
                {
                  type: 'TOKEN-REMOVE',
                  time: 200,
                },
              ],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [],
          adaptationLog: [
            {
              type: 'TOKEN-REMOVE',
              time: 200,
            },
            {
              type: 'TOKEN-MOVE',
              time: 300,
            },
          ],
          variables: {},
        });
      });

      // TODO: make this work for migrations and variable changes
      it('will not add redundant entries', () => {
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [
                {
                  type: 'TOKEN-MOVE',
                  time: 100,
                  tokenId: 'abc',
                },
                {
                  type: 'TOKEN-REMOVE',
                  time: 200,
                  tokenId: 'abc',
                },
              ],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: [],
                tokens: [],
                log: [],
                adaptationLog: [
                  {
                    type: 'TOKEN-MOVE',
                    time: 100,
                    tokenId: 'abc',
                  },
                ],
                variables: {},
              },
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: [],
                tokens: [],
                log: [],
                adaptationLog: [
                  {
                    type: 'TOKEN-MOVE',
                    time: 100,
                    tokenId: 'abc',
                  },
                  {
                    type: 'TOKEN-REMOVE',
                    time: 200,
                    tokenId: 'abc',
                  },
                ],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [],
          adaptationLog: [
            {
              type: 'TOKEN-MOVE',
              time: 100,
              tokenId: 'abc',
            },
            {
              type: 'TOKEN-REMOVE',
              time: 200,
              tokenId: 'abc',
            },
          ],
          variables: {},
        });
      });
    });

    describe('merging the variables of an instance', () => {
      it('will merge the variable information of an instance from two different machines', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [],
              variables: {
                a: {
                  log: [
                    {
                      changedBy: 'abc',
                      changedTime: 100,
                    },
                  ],
                  value: 5,
                },
              },
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [],
              variables: {
                b: {
                  log: [
                    {
                      changedBy: 'abc',
                      changedTime: 120,
                    },
                  ],
                  value: 20,
                },
              },
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [],
          adaptationLog: [],
          variables: {
            a: {
              log: [
                {
                  changedBy: 'abc',
                  changedTime: 100,
                },
              ],
              value: 5,
            },
            b: {
              log: [
                {
                  changedBy: 'abc',
                  changedTime: 120,
                },
              ],
              value: 20,
            },
          },
        });
      });

      it('will merge the value and log information of a single variable from two different machines', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [],
              variables: {
                a: {
                  log: [
                    {
                      changedBy: 'abc',
                      changedTime: 100,
                    },
                  ],
                  value: 5,
                },
              },
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [],
              variables: {
                a: {
                  log: [
                    {
                      changedBy: 'abc',
                      changedTime: 120,
                    },
                  ],
                  value: 20,
                },
              },
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [],
          adaptationLog: [],
          variables: {
            a: {
              log: [
                {
                  changedBy: 'abc',
                  changedTime: 100,
                },
                {
                  changedBy: 'abc',
                  changedTime: 120,
                },
              ],
              value: 20,
            },
          },
        });
      });

      it('will sort the log information of a variable from two different machines and use the latest value of the variable', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [],
              variables: {
                a: {
                  log: [
                    {
                      changedBy: 'abc',
                      changedTime: 140,
                    },
                  ],
                  value: 5,
                },
              },
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [],
              variables: {
                a: {
                  log: [
                    {
                      changedBy: 'abc',
                      changedTime: 120,
                    },
                  ],
                  value: 20,
                },
              },
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [],
          adaptationLog: [],
          variables: {
            a: {
              log: [
                {
                  changedBy: 'abc',
                  changedTime: 120,
                },
                {
                  changedBy: 'abc',
                  changedTime: 140,
                },
              ],
              value: 5,
            },
          },
        });
      });

      it('will not add variable log entries twice', () => {
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: [],
              tokens: [],
              log: [],
              adaptationLog: [],
              variables: {
                a: {
                  log: [
                    {
                      changedBy: 'abc',
                      changedTime: 100,
                    },
                    {
                      changedBy: 'abc',
                      changedTime: 120,
                    },
                  ],
                  value: 20,
                },
              },
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: [],
                tokens: [],
                log: [],
                adaptationLog: [],
                variables: {
                  a: {
                    log: [
                      {
                        changedBy: 'abc',
                        changedTime: 100,
                      },
                    ],
                    value: 5,
                  },
                },
              },
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: [],
                tokens: [],
                log: [],
                adaptationLog: [],
                variables: {
                  a: {
                    log: [
                      {
                        changedBy: 'abc',
                        changedTime: 100,
                      },
                      {
                        changedBy: 'abc',
                        changedTime: 120,
                      },
                    ],
                    value: 20,
                  },
                },
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [],
          adaptationLog: [],
          variables: {
            a: {
              log: [
                {
                  changedBy: 'abc',
                  changedTime: 100,
                },
                {
                  changedBy: 'abc',
                  changedTime: 120,
                },
              ],
              value: 20,
            },
          },
        });
      });
    });

    describe('merging the token state of an instance', () => {
      it('merges the token state of an instance on multiple machines to get a consolidated state of the whole instance', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['ENDED'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'ENDED',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'def',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine2',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING', 'ENDED'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'ENDED',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'def',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('overwrites the information of a forwarded token with the one on the machine the token was forwarded to', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['FORWARDED'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'FORWARDED',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'RUNNING',
                  machineHops: 1,
                  machineId: 'machine2',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 1,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('updates the information of a token if newer information becomes available', () => {
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'RUNNING',
                  machineId: 'machine1',
                  machineHops: 0,
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['ENDED'],
                tokens: [
                  {
                    tokenId: 'abc',
                    state: 'ENDED',
                    machineHops: 0,
                    machineId: 'machine1',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['ENDED'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'ENDED',
              machineId: 'machine1',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will not keep a token that was removed due to being split at a gateway', () => {
        // Token was split on the same machine
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'RUNNING',
                  machineId: 'machine1',
                  machineHops: 0,
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['RUNNING'],
                tokens: [
                  {
                    tokenId: 'abc|123',
                    state: 'RUNNING',
                    machineHops: 0,
                    machineId: 'machine1',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING'],
          tokens: [
            {
              tokenId: 'abc|123',
              state: 'RUNNING',
              machineId: 'machine1',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
        // Token was Forwarded an split on a second machine but the original machine still provides information about the forwarded token
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc|123',
                  state: 'RUNNING',
                  machineId: 'machine2',
                  machineHops: 1,
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['RUNNING'],
                tokens: [
                  {
                    tokenId: 'abc',
                    state: 'FORWARDED',
                    machineHops: 0,
                    machineId: 'machine1',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING'],
          tokens: [
            {
              tokenId: 'abc|123',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 1,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will not keep child tokens that were merged back into the parent token at a gateway', () => {
        // Token was forwarded and then split and merged on the same machine
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc|123',
                  state: 'RUNNING',
                  machineId: 'machine2',
                  machineHops: 1,
                },
                {
                  tokenId: 'abc|456',
                  state: 'RUNNING',
                  machineId: 'machine2',
                  machineHops: 1,
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['FORWARDED'],
                tokens: [
                  {
                    tokenId: 'abc',
                    state: 'FORWARDED',
                    machineHops: 0,
                    machineId: 'machine1',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['RUNNING'],
                tokens: [
                  {
                    tokenId: 'abc',
                    state: 'RUNNING',
                    machineHops: 1,
                    machineId: 'machine2',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 1,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will not keep two unrelated tokens that were merged into one at a parallel gateway', () => {
        // Process was started at two start events and the two paths were then merged at some point on another machine
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'RUNNING',
                  machineId: 'machine1',
                  machineHops: 0,
                },
                {
                  tokenId: 'def',
                  state: 'RUNNING',
                  machineId: 'machine1',
                  machineHops: 0,
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['FORWARDED'],
                tokens: [
                  {
                    tokenId: 'abc',
                    state: 'FORWARDED',
                    machineHops: 0,
                    machineId: 'machine1',
                  },
                  {
                    tokenId: 'def',
                    state: 'FORWARDED',
                    machineHops: 0,
                    machineId: 'machine1',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },

              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['RUNNING'],
                tokens: [
                  {
                    tokenId: 'abc_def',
                    state: 'RUNNING',
                    machineHops: 1,
                    machineId: 'machine2',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING'],
          tokens: [
            {
              tokenId: 'abc_def',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 1,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will not display a token that was forwarded and then removed on the other machine', () => {
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'RUNNING',
                  machineId: 'machine2',
                  machineHops: 1,
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['FORWARDED'],
                tokens: [
                  {
                    tokenId: 'abc',
                    state: 'FORWARDED',
                    machineHops: 0,
                    machineId: 'machine1',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: [],
                tokens: [],
                log: [],
                adaptationLog: [
                  {
                    type: 'TOKEN-REMOVE',
                    tokenId: 'abc',
                  },
                ],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: [],
          tokens: [],
          log: [],
          adaptationLog: [
            {
              type: 'TOKEN-REMOVE',
              tokenId: 'abc',
            },
          ],
          variables: {},
        });
      });

      it('will display the tokens inside a subprocess alongside the token that activated the subprocess', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING', 'FORWARDED'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine1',
                },
                {
                  tokenId: 'abc#123',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine1',
                },
                {
                  tokenId: 'abc#456',
                  state: 'FORWARDED',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc#456',
                  state: 'RUNNING',
                  machineHops: 1,
                  machineId: 'machine2',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'RUNNING',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'abc#123',
              state: 'RUNNING',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'abc#456',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 1,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });
    });

    describe('merging the instanceState of an instance', () => {
      it('does not add a state multiple times when merging the instanceState', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['RUNNING'],
              tokens: [
                {
                  tokenId: 'def',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine2',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'RUNNING',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'def',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will use the state STOPPED as the instanceState if the instance is stopped on one machine', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['ENDED'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'ENDED',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['STOPPED'],
              tokens: [
                {
                  tokenId: 'def',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine2',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['STOPPED'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'ENDED',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'def',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will stop using the STOPPED state when no machine returns it anymore', () => {
        expect(
          mergeInstanceInformation(
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['STOPPED'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'ENDED',
                  machineId: 'machine1',
                  machineHops: 0,
                },
                {
                  tokenId: 'def',
                  state: 'RUNNING',
                  machineId: 'machine2',
                  machineHops: 0,
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            [
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['ENDED'],
                tokens: [
                  {
                    tokenId: 'abc',
                    state: 'ENDED',
                    machineHops: 0,
                    machineId: 'machine1',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
              {
                processInstanceId: 'instance1',
                processVersion: 123,
                instanceState: ['RUNNING'],
                tokens: [
                  {
                    tokenId: 'def',
                    state: 'RUNNING',
                    machineHops: 0,
                    machineId: 'machine2',
                  },
                ],
                log: [],
                adaptationLog: [],
                variables: {},
              },
            ]
          )
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING', 'ENDED'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'ENDED',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'def',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will use the state PAUSED as the instanceState if the instance is paused on one machine', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['ENDED'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'ENDED',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['PAUSED'],
              tokens: [
                {
                  tokenId: 'def',
                  state: 'PAUSED',
                  machineHops: 0,
                  machineId: 'machine2',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['PAUSED'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'ENDED',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'def',
              state: 'PAUSED',
              machineId: 'machine2',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will use the state STOPPED as the instanceState if the instance is stopped on one machine', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['ENDED'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'ENDED',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['PAUSING'],
              tokens: [
                {
                  tokenId: 'def',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine2',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['PAUSING'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'ENDED',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'def',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will use the state PAUSING as the instanceState if the instance is paused on one machine but still pausing on another', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['PAUSED'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'PAUSED',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['PAUSING'],
              tokens: [
                {
                  tokenId: 'def',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine2',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['PAUSING'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'PAUSED',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'def',
              state: 'RUNNING',
              machineId: 'machine2',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });

      it('will sort the states to allow a quick deduction about the overall state of the instance', () => {
        expect(
          mergeInstanceInformation(undefined, [
            {
              processInstanceId: 'instance1',
              processVersion: 123,
              instanceState: ['ENDED', 'RUNNING'],
              tokens: [
                {
                  tokenId: 'abc',
                  state: 'ENDED',
                  machineHops: 0,
                  machineId: 'machine1',
                },
                {
                  tokenId: 'def',
                  state: 'RUNNING',
                  machineHops: 0,
                  machineId: 'machine1',
                },
              ],
              log: [],
              adaptationLog: [],
              variables: {},
            },
          ])
        ).toStrictEqual({
          processInstanceId: 'instance1',
          processVersion: 123,
          instanceState: ['RUNNING', 'ENDED'],
          tokens: [
            {
              tokenId: 'abc',
              state: 'ENDED',
              machineId: 'machine1',
              machineHops: 0,
            },
            {
              tokenId: 'def',
              state: 'RUNNING',
              machineId: 'machine1',
              machineHops: 0,
            },
          ],
          log: [],
          adaptationLog: [],
          variables: {},
        });
      });
    });
  });
});
