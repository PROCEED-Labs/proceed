/* eslint-disable guard-for-in */
const { communication } = require('@proceed/distribution');
const { information, config } = require('@proceed/machine');
const { network, timer } = require('@proceed/system');
const Hceval = require('./hard_constraint_evaluation/hc-eval.js');

module.exports = {
  /**
   * Retrieves values for every softconstraint for every external machine which satisfies the hardconstraints
   * External machines have to respect the adress-data constraints
   * @param {Array} hardConstraints Every hardconstraint to be fullfiled by external machines
   * @param {Array} softConstraints - Softconstraints to retrieve value for from external machines
   * @param {Object} flowNodeinformation - information about the next flowNode to be executed, e.g. whether it is a user task
   * @param {Object[]} [additionalMachines] list of machines that should be considered even if not locally discovered
   * @returns {Promise<Array>} valuesList - List with externalmachines and corresponding softConstraintValues
   */
  async getExternalSoftConstraintValues(
    hardConstraints,
    softConstraints,
    flowNodeInformation,
    additionalMachines,
  ) {
    // get softconstraint values for external machines

    const { router, engine } = await config.readConfig();

    const timeout = Math.min(
      router.waitTimeExternalEvaluations,
      engine.networkRequestTimeout * 1000,
    );

    return new Promise((resolve) => {
      const valuesList = [];

      // stop listening to network requests after timer expired
      timer.setTimeout(() => {
        resolve(valuesList);
      }, timeout);

      const callback = (result, moreAreComing) => {
        if (result) {
          valuesList.push(result);
          if (router.softConstraintPolicy === 'OnFirstFittingMachine') {
            resolve(valuesList);
          }
        }

        if (!moreAreComing) {
          resolve(valuesList);
        }
      };
      if (
        router.softConstraintPolicy === 'AsFastAsPossible' ||
        router.softConstraintPolicy === 'OnFirstFittingMachine'
      ) {
        this.sendHardConstraints(
          hardConstraints,
          [],
          flowNodeInformation,
          callback,
          additionalMachines,
        );
      } else {
        this.sendHardConstraints(
          hardConstraints,
          softConstraints,
          flowNodeInformation,
          callback,
          additionalMachines,
        );
      }
    });
  },

  /**
   * Retrieves values for every softconstraint for local machine
   * @param {Array} softConstraints - Softconstraints to retrieve value for
   * @returns {Promise<object>} Returns values for all softconstraints
   */
  async getLocalSoftConstraintValues(softConstraints) {
    let localSoftConstraintValues = {}; // get softconstraint values for local machine

    if (softConstraints.length > 0) {
      const informationCategories = softConstraints.reduce((categories, softConstraint) => {
        const [newCategory] = softConstraint.name.replace('machine.', '').split('.');

        if (!categories.includes(newCategory)) {
          categories.push(newCategory);
        }

        return categories;
      }, []);

      const machineInformation = await information.getMachineInformation(informationCategories);

      // map nested values to softconstraints
      // e.g: SC: machine.cpu.cores, IO { cpu: { cores: 12, ... }, ...} => { "machine.cpu.cores": 12 }
      localSoftConstraintValues = softConstraints.reduce((values, softConstraint) => {
        let name = softConstraint.name.replace('machine.', '');

        let deepValue;

        while (name) {
          const [subscript, nextName] = name.split('.');
          deepValue = deepValue ? deepValue[subscript] : machineInformation[subscript];
          name = nextName;
        }

        return { ...values, [softConstraint.name]: deepValue };
      }, {});
    }
    return localSoftConstraintValues;
  },

  /**
   * Send HardConstraints to every allowed Machine and call callback with softConstraint values for every succesful request
   * which satisfies hard constraints
   * @param {Array} hardConstraints Every hardconstraint to be fullfiled by external machines
   * @param {Array} softConstraints - Softconstraints to retrieve value for from external machines
   * @param {Object} flowNodeInformation - information about the next flowNode to be executed, e.g. whether it is a user task
   * @param {Object[]} [additionalMachines] list of machines that should be considered even if not locally discovered
   */
  sendHardConstraints(
    hardConstraints,
    softConstraints,
    flowNodeInformation,
    callback,
    additionalMachines,
  ) {
    const adressConstraintNames = [
      'machine.id',
      'machine.name',
      'machine.hostname',
      'machine.network.ip4',
      'machine.network.ip6',
      'machine.network.mac',
      'machine.network.netmaskv4',
      'machine.network.netmaskv6',
    ];

    const addressConstraints = hardConstraints.filter((hardConstraint) =>
      adressConstraintNames.includes(hardConstraint.name),
    );
    const availableMachines = communication.getAvailableMachines();

    // add additional machines if they aren't already known
    if (additionalMachines && Array.isArray(additionalMachines)) {
      additionalMachines.forEach((machine) => {
        if (
          !availableMachines.some(
            (availableMachine) =>
              availableMachine.id === machine.id ||
              (availableMachine.ip === machine.ip && availableMachine.port === machine.port),
          )
        ) {
          availableMachines.push(machine);
        }
      });
    }

    // filter for allowed machines using adressData
    const allowedMachines = availableMachines.filter((availableMachine) => {
      const { ip, id, name, hostname } = availableMachine;
      // true if machine satisfies all adress-constrains
      return Hceval.evaluateAllConstraints(addressConstraints, {
        'machine.network.ip4': ip,
        'machine.id': id,
        'machine.name': name,
        'machine.hostname': hostname,
      });
    });

    // add machines that are expected through the given address constraint but not known through local discovery
    addressConstraints.forEach((constraint) => {
      if (
        (constraint.name === 'machine.network.ip4' || constraint.name === 'machine.network.ip6') &&
        constraint.condition === '=='
      ) {
        constraint.values.forEach(({ value: ip }) => {
          if (!allowedMachines.some((machine) => machine.ip === ip)) {
            allowedMachines.push({ ip, port: 33029 });
          }
        });
      }
    });

    if (allowedMachines.length === 0) {
      callback(undefined, false);
    }

    let remainingRequestsCounter = allowedMachines.length;

    allowedMachines.forEach((allowedMachine) => {
      const { ip, port, id, name, hostname, currentlyConnectedEnvironments } = allowedMachine;
      let data = {};
      data.id = id;
      data.name = name;
      data.ip = ip;
      data.port = port;
      data.hostname = hostname;
      data.currentlyConnectedEnvironments = currentlyConnectedEnvironments;
      data.softConstraintValues = {};

      // request hardConstraint evaluation and softConstraint values
      network
        .sendData(ip, port, '/evaluation', 'POST', 'application/json', {
          formData: { hardConstraints, softConstraints, flowNodeInformation },
        })
        .then(
          async (result) => {
            // Handle request success or failures
            const softConstraintValues = JSON.parse(result.body);

            if (softConstraintValues) {
              // if the machine is requested through constraint, request additional info from machine
              if (!id) {
                const additionalInformation = JSON.parse(
                  (
                    await network.sendRequest(
                      ip,
                      port,
                      '/machine/id,name,hostname,currentlyConnectedEnvironments',
                    )
                  ).body,
                );
                data = { ...data, ...additionalInformation };
              }

              data.softConstraintValues = softConstraintValues;
              --remainingRequestsCounter > 0 ? callback(data, true) : callback(data, false);
            } else {
              --remainingRequestsCounter > 0
                ? callback(undefined, true)
                : callback(undefined, false);
            }
          },
          (error) => {
            --remainingRequestsCounter > 0 ? callback(undefined, true) : callback(undefined, false);
          },
        );
    });
  },

  /**
   *  Checks if local engine has to be used
   * @param {Array} constraints
   * @returns {Promise<boolean>} - true if execution has to be on local engine, false if not
   */
  async preCheckLocalExec(constraints) {
    // last occurence of sameMachine-constraint
    const softConstraintPolicy = await config.readConfig('router.softConstraintPolicy');
    if (softConstraintPolicy === 'LocalMachineOnly') {
      return true;
    }

    const sameMachineConstraint = constraints
      .reverse()
      .find((constraint) => constraint.name === 'sameMachine');
    if (!sameMachineConstraint) {
      return false;
    }
    // should always be only one value in values-array
    return sameMachineConstraint.values[sameMachineConstraint.values.length - 1].value;
  },

  /**
   * Checks the execution configuration values; if machine is allowed to execute regarding configuration
   *
   * @param {object} flowNodeInformation information about the next flowNode to be executed, e.g. whether it is a user task
   * @returns {Promise<boolean>} true if execution config requirements fulfilled, false if not
   */
  async checkExecutionConfig(flowNodeInformation) {
    const { processes } = await config.readConfig();

    if (processes.deactivateProcessExecution) {
      return false;
    }

    if (flowNodeInformation && flowNodeInformation.isUserTask && !processes.acceptUserTasks) {
      return false;
    }

    return true;
  },
};
