/**
 * @memberof module:@proceed/constraint-parser-xml-json.ConstraintParser
 * @class
 *
 * This library transforms the PROCEED process constraints from an intermediate to a final JS Object
 *
 * @hideconstructor
 */
const intermediateToFinalJSParser = {
  logger: null,

  convertConstraints(constraintsObject) {
    if (!constraintsObject.processConstraints) {
      throw new Error("Constraint doesn't contain ProcessConstraints element");
    }

    const processConstraints = this.convertProcessConstraints(constraintsObject.processConstraints);

    return { processConstraints };
  },

  /**
   * Converts all children of the given object into the preferred form and return the new object
   *
   * @param {object} processConstraintsObj the object that is to be converted
   * @returns {object} - a new object containing all of the given objects children in the preferred form
   */
  convertProcessConstraints(processConstraintsObj) {
    const processConstraints = {};

    let { hardConstraints } = processConstraintsObj;
    if (hardConstraints) {
      hardConstraints = this.convertHardConstraints(hardConstraints);

      if (hardConstraints) {
        processConstraints.hardConstraints = hardConstraints;
      }
    }

    let { softConstraints } = processConstraintsObj;
    if (softConstraints) {
      softConstraints = this.convertSoftConstraints(softConstraints);

      if (softConstraints) {
        processConstraints.softConstraints = softConstraints;
      }
    }

    return processConstraints;
  },

  /**
   * Converts a given hardConstraints object to an array containing all children in the preferred form
   *
   * @param {object} hardConstraintsObj the hardConstraints object that is to be converted
   * @returns {array} - an array containing all hardConstraint and constraintsGroup elements
   */
  convertHardConstraints(hardConstraintsObject) {
    const hardConstraintsArray = [];

    const { hardConstraint } = hardConstraintsObject;
    const { constraintGroup } = hardConstraintsObject;

    if (!hardConstraint && !constraintGroup) {
      return null;
    }

    if (hardConstraint) {
      if (!Array.isArray(hardConstraint)) {
        hardConstraintsArray.push(this.convertHardConstraint(hardConstraint));
      } else {
        hardConstraint.forEach((el) => {
          hardConstraintsArray.push(this.convertHardConstraint(el));
        });
      }
    }

    if (constraintGroup) {
      if (!Array.isArray(constraintGroup)) {
        hardConstraintsArray.push(this.convertConstraintGroup(constraintGroup));
      } else {
        hardConstraintsObject.constraintGroup.forEach((el) => {
          hardConstraintsArray.push(this.convertConstraintGroup(el));
        });
      }
    }

    return hardConstraintsArray;
  },

  /**
   * Converts a copy of a given hardConstraint element into the preferred form and returns it
   *
   * @param {object} hardConstraintObj  The hardConstraint object that is to be converted
   * @returns {object} - the converted copy
   */
  convertHardConstraint(hardConstraintObj) {
    if (!hardConstraintObj.name || !hardConstraintObj.condition) {
      let missingInformation = '';
      if (!hardConstraintObj.name && !hardConstraintObj.condition) {
        missingInformation = 'name, condition';
      } else if (!hardConstraintObj.name) {
        missingInformation = 'name';
      } else {
        missingInformation = 'condition';
      }

      throw new Error(`Missing information in hardConstraint: ${missingInformation}`);
    }

    let newObject = { ...hardConstraintObj, _type: 'hardConstraint' };

    if (!newObject._attributes) {
      newObject._attributes = {};
    }

    newObject.condition = this.convertCondition(newObject.condition);

    let { hardConstraints } = newObject;
    if (hardConstraints) {
      hardConstraints = this.convertHardConstraints(hardConstraints);
      if (hardConstraints) {
        newObject.hardConstraints = hardConstraints;
      }
    }

    newObject = this.convertValues(newObject);

    return newObject;
  },

  /**
   * Converts a copy of a constraintGroup element to the preferred form and returns it
   *
   * @param {object} constraintGroupObj the constraintGroup that is to be converted
   * @returns {object} - the converted copy
   */
  convertConstraintGroup(constraintGroupObj) {
    const newObject = { ...constraintGroupObj, _type: 'constraintGroup', constraintGroup: [] };

    if (!newObject._attributes) {
      newObject._attributes = {};
    }

    if (!newObject._attributes.id) {
      throw new Error('ConstraintGroup with missing id found.');
    }

    const { hardConstraint } = newObject;
    if (hardConstraint) {
      if (!Array.isArray(newObject.hardConstraint)) {
        newObject.constraintGroup.push(this.convertHardConstraint(hardConstraint));
      } else {
        hardConstraint.forEach((el) => {
          newObject.constraintGroup.push(this.convertHardConstraint(el));
        });
      }
      delete newObject.hardConstraint;
    }

    const { constraintGroupRef } = newObject;
    if (constraintGroupRef) {
      if (!Array.isArray(constraintGroupRef)) {
        newObject.constraintGroup.push(this.convertConstraintGroupRef(constraintGroupRef));
      } else {
        constraintGroupRef.forEach((el) => {
          newObject.constraintGroup.push(this.convertConstraintGroupRef(el));
        });
      }
      delete newObject.constraintGroupRef;
    }

    return newObject;
  },

  /**
   * Adds "_type: 'constraintGroupRef'" to a copy of the given object and returns it
   *
   * @param {object} constraintGroupRefObj The constraintGroupRef that should be modified
   * @returns {object} - a copy of the given object with an added member _type
   */
  convertConstraintGroupRef(constraintGroupRefObj) {
    if (!constraintGroupRefObj._attributes || !constraintGroupRefObj._attributes.ref) {
      throw new Error('ConstraintGroupRef element without ref attribute found.');
    }

    return { ...constraintGroupRefObj, _type: 'constraintGroupRef' };
  },

  /**
   * Converts the softConstraints object into an array in the preferred form [{softConstraint},{softConstraint},...]
   *
   * @param {object} softConstraintsObj an object containing all of the softConstraints elements softConstraint elements
   * @returns {array} - an array containing representations of all of the softConstraints elements softConstraint elements
   */
  convertSoftConstraints(softConstraintsObj) {
    const softConstraintsArray = [];

    if (!softConstraintsObj.softConstraint) {
      return null;
    }

    const { softConstraint } = softConstraintsObj;
    if (!Array.isArray(softConstraint)) {
      softConstraintsArray.push(this.convertSoftConstraint(softConstraint));
    } else {
      softConstraint.forEach((el) => {
        softConstraintsArray.push(this.convertSoftConstraint(el));
      });
    }

    return softConstraintsArray;
  },

  convertSoftConstraint(softConstraintObj) {
    if (!softConstraintObj.name || !softConstraintObj.condition) {
      let missingInformation = '';
      if (!softConstraintObj.name && !softConstraintObj.condition) {
        missingInformation = 'name, condition';
      } else if (!softConstraintObj.name) {
        missingInformation = 'name';
      } else {
        missingInformation = 'condition';
      }

      throw new Error(`Missing information in softConstraint: ${missingInformation}`);
    }

    const newSoftConstraintObj = { ...softConstraintObj };
    if (!softConstraintObj._attributes) {
      newSoftConstraintObj._attributes = {};
    }

    newSoftConstraintObj._type = 'softConstraint';

    return newSoftConstraintObj;
  },

  /**
   * Converts character entity references in conditions to < and >
   *
   * @param {string} condition in form of a string
   * @returns {string} - the condition with entity references for < and > being converted
   */
  convertCondition(condition) {
    let newCondition = condition;

    if (typeof condition === 'string') {
      newCondition = newCondition.replace(/&lt;/g, '<');
      newCondition = newCondition.replace(/&gt;/g, '>');
    }

    return newCondition;
  },

  /**
   * Converts the values entry in the given object to the preferred form { ..., values: [{valueObject},{valueObject}], _valuesAttributes: {...}}
   *
   * @param {object} object with values in the form created by fast-xml-parser
   * @returns {object} - object with values in preferred form
   */
  convertValues(object) {
    if (!object.values) {
      return object;
    }

    const newObject = { ...object };

    if (newObject.values._attributes) {
      newObject._valuesAttributes = newObject.values._attributes;
    } else {
      newObject._valuesAttributes = {};
    }

    if (!Array.isArray(newObject.values.value)) {
      newObject.values = [this.convertValue(newObject.values.value)];
    } else {
      const valueArray = [];
      newObject.values.value.forEach((el) => {
        valueArray.push(this.convertValue(el));
      });
      newObject.values = valueArray;
    }

    return newObject;
  },

  /**
   * Converts a value to a value object in the preferred form { value: valueName, _valueAttributes: {...}}
   *
   * @param {string|object} either the values name as a string or an object containing the values name and attributes
   * @returns {object} a value object in the preferred form
   */
  convertValue(value) {
    let valueName = '';
    let _valueAttributes = {};

    if (typeof value === 'object') {
      valueName = value['#text'];
      _valueAttributes = value._attributes;
    } else {
      valueName = value;
    }

    return { value: valueName, _valueAttributes };
  },
};

module.exports = intermediateToFinalJSParser;
