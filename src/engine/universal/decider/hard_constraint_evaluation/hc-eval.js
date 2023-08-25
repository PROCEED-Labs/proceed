const { information } = require('@proceed/machine');
const HardConstraint = require('./hardconstraint.js');

/**
 * @memberof module:@proceed/decider
 * @class
 *
 * Evaluator for HardConstraints
 * @hideconstructor
 */
class HardConstraintEvaluator {
  /**
   * Evaluation of nested hardConstraint with use of machineInformation
   * @param {hardConstraint}
   * @param {infos} machineinformation
   * @returns boolean result of evaluation
   */
  static evaluateNestedHardConstraint(nestedHardConstraint, infos) {
    const {
      name,
      condition,
      values,
      _valuesAttributes: { conjunction },
      hardConstraints,
    } = nestedHardConstraint;
    // every subconstraint of nested constraint (constraints in hardConstraints-array with added properties of parent constraint)
    const evaluatedSubConstraintList = values.map((value) => {
      const subConstraint = hardConstraints.map((hc) => {
        const hardConstraintsElement = { ...hc };
        if (hardConstraintsElement._type === 'hardConstraint') {
          hardConstraintsElement.name = `${name + condition + value.value}.${
            hardConstraintsElement.name
          }`; // concat value-attributes with name of hardConstraints-Element
        } else {
          hardConstraintsElement.constraintGroup = hardConstraintsElement.constraintGroup.map(
            (cg) => {
              const constraintGroupElement = { ...cg };
              if (cg._type === 'hardConstraint') {
                constraintGroupElement.name = `${name + condition + value.value}.${
                  constraintGroupElement.name
                }`;
              }
              return constraintGroupElement;
            },
          );
        }
        return hardConstraintsElement;
      });

      const evaluatedSubConstraint = this.evaluateAllConstraints(subConstraint, infos);
      return evaluatedSubConstraint;
    });

    if (conjunction === 'OR')
      return evaluatedSubConstraintList.some((evaluatedSubConstraint) => evaluatedSubConstraint);
    return evaluatedSubConstraintList.every((evaluatedSubConstraint) => evaluatedSubConstraint);
  }

  /**
   * Evaluation of hardConstraint with use of machineInformation
   * @param {hardConstraint}
   * @param {infos} machineinformation
   * @returns boolean result of evaluation
   */
  static evaluateHardConstraint(hardConstraint, infos) {
    const {
      name,
      condition,
      values,
      _valuesAttributes: { conjunction },
      hardConstraints,
    } = hardConstraint;

    if (hardConstraints === undefined) {
      const searchedInfo = Object.keys(infos).find((info) => info.replace('_', '.') === name);
      return new HardConstraint({
        name,
        condition,
        values,
        conjunction,
      }).satisfiedByMachine(infos[searchedInfo]); // evaluate hardconstraint using machineinfo
    } // nested constraint
    return this.evaluateNestedHardConstraint(hardConstraint, infos);
  }

  /**
   * Evaluation of all constraintGroups with use of machineInformation
   * @param [constraintGroups]
   * @param {infos} machineinformation
   * @returns boolean result of evaluation
   */
  static evaluateAllConstraintGroups(constraintGroups, infos) {
    const evaluatedConstraintGroupList = [];
    const referencedConstraintGroupList = [];

    constraintGroups.forEach((cg) => {
      const {
        _attributes: { id, conjunction },
        constraintGroup,
      } = cg;

      const evaluatedSubConstraintList = constraintGroup.map((subConstraint) => {
        if (subConstraint._type === 'constraintGroupRef') {
          // result of evaluation for referenced constraintgroup
          const referencedConstraintGroup = evaluatedConstraintGroupList.find(
            (group) => group.id === subConstraint._attributes.ref,
          );
          referencedConstraintGroupList.push(referencedConstraintGroup.id);
          return referencedConstraintGroup.result;
        } // else: hardConstraint
        // result of evaluation for hardconstraint
        return this.evaluateHardConstraint(subConstraint, infos);
      });

      let result;
      // evaluation of constraintgroup based on conjunction
      if (conjunction === 'OR')
        result = evaluatedSubConstraintList.some(
          (evaluatedSubConstraint) => evaluatedSubConstraint,
        );
      else {
        result = evaluatedSubConstraintList.every(
          (evaluatedSubConstraint) => evaluatedSubConstraint,
        );
      }
      evaluatedConstraintGroupList.push({ id, result }); // evaluated constraintgroup
    });

    return evaluatedConstraintGroupList.every((group) => {
      if (!referencedConstraintGroupList.includes(group.id)) return group.result;
      return true;
    });
  }

  /**
   * Evaluation of all constraints with use of machineInformation,
   * returns boolean with evalution-result
   *
   * @param [constraints]
   * @param {infos} machineinformation
   * @returns boolean evaluationResult - result of evaluation
   */
  static evaluateAllConstraints(constraints, infos) {
    const constraintGroups = constraints.filter(
      (constraint) => constraint._type === 'constraintGroup',
    );
    const evaluationResultConstraintGroups = this.evaluateAllConstraintGroups(
      constraintGroups,
      infos,
    );

    const hardConstraints = constraints.filter(
      (constraint) => constraint._type === 'hardConstraint',
    );
    const evaluationResultHardConstraints = hardConstraints.every((hardConstraint) =>
      this.evaluateHardConstraint(hardConstraint, infos),
    );

    const evaluationResult = evaluationResultConstraintGroups && evaluationResultHardConstraints;
    return evaluationResult;
  }

  /**
   * Evaluation of process-execution constraints with use of information of current execution,
   * returns list of unfulfilled constraints
   *
   * @param {Array} constraints - constraints
   * @param {infos} execution information
   * @returns {Array} unfulfilledConstraints
   */
  static evaluateExecutionConstraints(constraints, infos) {
    const unfulfilledConstraints = constraints.filter((constraint) => {
      const { name, values } = constraint;
      if (name === 'maxTime') {
        return values.some((value) => infos.time > value.value);
      }
      if (name === 'maxTimeGlobal') {
        return values.some((value) => infos.timeGlobal > value.value);
      }
      if (name === 'maxMachineHops') {
        return values.some((value) => infos.machineHops > value.value);
      }
      if (name === 'maxTokenStorageTime') {
        return values.some((value) => infos.storageTime > value.value);
      }
      if (name === 'maxTokenStorageRounds') {
        return values.some((value) => infos.storageRounds > value.value);
      }
      return false;
    });

    return unfulfilledConstraints;
  }

  /**
   * Iterates through array of constraints to retrieve every constraint name
   * @param [constraints]
   * @returns [hardConstraintNames]
   */
  static getHardConstraintNames(constraints) {
    const hardConstraintNames = new Set();
    constraints.forEach((constraint) => {
      if (constraint._type === 'hardConstraint') {
        const { name, condition, values, hardConstraints } = constraint;
        if (hardConstraints !== undefined) {
          // nested constraint
          const subConstraintNames = this.getHardConstraintNames(hardConstraints);
          subConstraintNames.forEach((subConstraintName) => {
            values.forEach((value) => {
              hardConstraintNames.add(
                `${name + condition + value.value.replace('.', '_')}.${subConstraintName}`,
              );
            });
          });
        } else {
          hardConstraintNames.add(name);
        }
      } else if (constraint._type === 'constraintGroup') {
        // constraintGroup
        const { constraintGroup } = constraint;
        const groupNames = this.getHardConstraintNames(constraintGroup);
        groupNames.forEach((groupName) => hardConstraintNames.add(groupName));
      }
    });
    return [...hardConstraintNames];
  }

  /**
   * Returns true, if the machine satisfies all hard constraints.
   *
   * 1. Find every constraint name in constraints-array
   * 2. Get machineInformation for hard constraint names
   * 3. Evaluation of every constraint based on machineInformation
   * 4. Return true if every constraint is satisfied
   *
   * @param [constraints] Constraints to check on machine
   * @returns boolean If all hardconstraints are satisfied
   */

  static async machineSatisfiesAllHardConstraints(constraints) {
    const hardConstraintNames = this.getHardConstraintNames(constraints);

    const informationCategories = hardConstraintNames.reduce((categories, hardConstraintName) => {
      const [newCategory] = hardConstraintName.replace('machine.', '').split('.');
      if (!categories.includes(newCategory)) {
        categories.push(newCategory);
      }

      return categories;
    }, []);

    const informationCategoriesResult =
      await information.getMachineInformation(informationCategories);

    const infos = hardConstraintNames.reduce((values, hardConstraintName) => {
      let name = hardConstraintName.replace('machine.', '');

      let deepValue;

      while (name) {
        const [subscript, nextName] = name.split('.');

        if (!deepValue) {
          deepValue = informationCategoriesResult[subscript];
        } else if (Array.isArray(deepValue)) {
          deepValue = deepValue.map((value) => value[subscript]);
        } else {
          deepValue = deepValue[subscript];
        }

        name = nextName;
      }

      return { ...values, [hardConstraintName]: deepValue };
    }, {});

    return this.evaluateAllConstraints(constraints, infos);
  }
}
module.exports = HardConstraintEvaluator;
