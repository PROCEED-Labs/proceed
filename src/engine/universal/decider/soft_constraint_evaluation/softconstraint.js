/**
 * @memberof module:@proceed/decider
 * @class
 *
 * Represents one SoftConstraint
 */
class SoftConstraint {
  /**
   * @param {object} constraint Constraint object
   */
  constructor(constraint) {
    const { name, condition, weight, extremeValue } = constraint;
    this.attribute = name;
    this.condition = condition;
    if (weight === undefined) this.weight = 1;
    else this.weight = weight;
    this.extremeValue = extremeValue;
  }

  /**
   * Calculates score for single softconstraint based on value for softconstraint
   * @param value value for softConstraint
   */
  calculateScore(value) {
    let score;
    if (this.condition === 'max') score = (value / this.extremeValue) * this.weight;
    else score = (this.extremeValue / value) * this.weight;
    return score;
  }
}
module.exports = SoftConstraint;
