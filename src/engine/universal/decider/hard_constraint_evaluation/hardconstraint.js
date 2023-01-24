/**
 * @memberof module:@proceed/decider
 * @class
 *
 * Represents one HardConstraint
 */

class HardConstraint {
  /**
   * @param {object} constraint Constraint object
   */
  constructor(constraint) {
    const { name, condition, values, conjunction } = constraint;
    this.values = [];
    values.forEach((value) => this.values.push(value.value));
    this.attribute = name;
    this.condition = condition;

    if (conjunction === undefined) this.conjunction = 'OR';
    else this.conjunction = conjunction;
  }

  /**
   * Check if single hardconstraint is satisfied
   * @param {Object} machine Machine to check constraints on
   * @returns {boolean} If hardconstraint is satisfied
   */
  satisfiedByMachine(information) {
    const { condition, values, conjunction } = this;
    let info = [];
    if (!Array.isArray(information)) info.push(information);
    else info = information;

    switch (condition) {
      case '<': {
        if (conjunction === 'OR') return values.some((value) => info.some((inf) => inf < value));
        return values.every((value) => info.some((inf) => inf < value));
      }
      case '>': {
        if (conjunction === 'OR') return values.some((value) => info.some((inf) => inf > value));
        return values.every((value) => info.some((inf) => inf > value));
      }
      case '==': {
        if (conjunction === 'OR') return values.some((value) => info.some((inf) => inf === value));
        return values.every((value) => info.some((inf) => inf === value));
      }
      case '!=': {
        if (conjunction === 'OR') return values.some((value) => info.some((inf) => inf !== value));
        return values.every((value) => info.some((inf) => inf !== value));
      }
      case '<=': {
        if (conjunction === 'OR') return values.some((value) => info.some((inf) => inf <= value));
        return values.every((value) => info.some((inf) => inf <= value));
      }
      case '>=': {
        if (conjunction === 'OR') return values.some((value) => info.some((inf) => inf >= value));
        return values.every((value) => info.some((inf) => inf >= value));
      }
      default: {
        return false;
      }
    }
  }
}

module.exports = HardConstraint;
