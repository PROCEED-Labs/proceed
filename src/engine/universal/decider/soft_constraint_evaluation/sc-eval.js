const SoftConstraint = require('./softconstraint.js');

/**
 * @memberof module:@proceed/decider
 * @class
 *
 * Evaluator for SoftConstraints
 * @hideconstructor
 */
class SoftConstraintEvaluator {
  /**
   * Calculates total score for every machine using respective values for softconstraints
   * -> Returns ordered list of machines based on total score
   * @param [constraints]
   * @param [valuesList]
   * @returns [evaluatedMachines]
   */

  static evaluateEveryMachine(constraints, valuesList) {
    const scores = {};
    // Initialize score for every machine id
    valuesList.forEach((values) => {
      scores[values.id] = 0;
    });
    /**
     * Iterates through every constraint, calculates extreme value of all values for constraint
     *  -> Iterates through valuesList to add score to every machine id
     */
    constraints.forEach((constraint) => {
      const {
        name,
        condition,
        _attributes: { weight },
      } = constraint;

      let extremeValue;
      if (condition === 'max')
        extremeValue = Math.max(...valuesList.map((values) => values.softConstraintValues[name]));
      else {
        extremeValue = Math.min(...valuesList.map((values) => values.softConstraintValues[name]));
      }

      const softConstraint = new SoftConstraint({
        name,
        condition,
        weight,
        extremeValue,
      });

      valuesList.forEach((values) => {
        const value = values.softConstraintValues[softConstraint.attribute];
        const score = softConstraint.calculateScore(value);
        scores[values.id] += score;
      });
    });

    const machineInfoList = valuesList.map((machineValue) => {
      const machineInfo = { ...machineValue };
      delete machineInfo.softConstraintValues;
      return machineInfo;
    });

    const evaluatedMachines = machineInfoList.sort((a, b) => scores[b.id] - scores[a.id]);

    return evaluatedMachines;
  }
}
module.exports = SoftConstraintEvaluator;
