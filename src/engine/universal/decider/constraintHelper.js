module.exports = {
  /**
   * Concatenates flowNodeConstraints and processConstraint
   * For equal keys the flowNodeConstraint is prefered
   * @param {Array} flowNodeConstraints
   * @param {Array} processConstraints
   * @returns {Array} concatenatedConstraints - all flowNodeConstraints, and processConstraints without duplicates
   */
  concatAllConstraints(flowNodeConstraints, processConstraints) {
    if (!processConstraints && !flowNodeConstraints) {
      return [];
    }
    if (!processConstraints) {
      return [...flowNodeConstraints];
    }
    if (!flowNodeConstraints) {
      return [...processConstraints];
    }

    const filteredProcessConstraints = this.filterOutDuplicateProcessConstraints(
      flowNodeConstraints,
      processConstraints
    );

    const concatenatedConstraints = [...filteredProcessConstraints, ...flowNodeConstraints];
    return concatenatedConstraints;
  },

  /**
   * Filters out constraints from processConstraints which are already present in flowNodeConstraints
   * @param {Array} flowNodeConstraints
   * @param {Array} processConstraints
   * @returns {Array} processConstraints without duplicates
   */
  filterOutDuplicateProcessConstraints(flowNodeConstraints, processConstraints) {
    if (!processConstraints) {
      return [];
    }
    if (!flowNodeConstraints) {
      return processConstraints;
    }

    const filteredProcessConstraints = processConstraints.filter((processConstraint) => {
      if (processConstraint._type !== 'constraintGroup') {
        const duplicateConstraint = flowNodeConstraints.find((flowNodeConstraint) => {
          return flowNodeConstraint.name === processConstraint.name;
        });
        return !duplicateConstraint;
      }
      return true;
    });

    return filteredProcessConstraints;
  },

  /**
   * Filters out all the process execution constraints, so only constraints related to machine are left
   * @param {Array} hardConstraints all hardConstraints
   * @returns {Array} non-processExecution constraints
   */
  filterOutProcessExecutionConstraints(hardConstraints) {
    const processExecutionConstraintNames = [
      'maxTime',
      'maxTimeGlobal',
      'maxTokenStorageTime',
      'maxTokenStorageRounds',
      'maxMachineHops',
      'sameMachine',
    ];

    const remainingConstraints = hardConstraints.filter(
      (hardConstraint) => !processExecutionConstraintNames.includes(hardConstraint.name)
    );

    return remainingConstraints;
  },
};
