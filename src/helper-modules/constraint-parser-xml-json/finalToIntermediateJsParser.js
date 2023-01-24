/**
 * @memberof module:@proceed/constraint-parser-xml-json.ConstraintParser
 * @class
 *
 * This library transforms the PROCEED process constraints from JS to DOM
 *
 * @hideconstructor
 */
const finalToIntermediateJsParser = {
  logger: null,

  convertConstraints(constraintsObj) {
    if (!constraintsObj.processConstraints) {
      throw new Error('Root element has no member called processConstraints');
    }

    if (
      typeof constraintsObj.processConstraints !== 'object' ||
      Array.isArray(constraintsObj.processConstraints)
    ) {
      const type =
        typeof constraintsObj.processConstraints === 'object'
          ? 'array'
          : typeof constraintsObj.processConstraints;
      throw new Error(`Expected processConstraints to be an object but is ${type} instead`);
    }

    const newProcessConstraints = this.convertProcessConstraints(constraintsObj.processConstraints);
    return { 'proceed:processConstraints': newProcessConstraints };
  },

  /**
   * converts a copy of a given processConstraints element and it's children to the layout needed by fast-xml-parser
   *
   * @param {object} processConstraintObj
   */
  convertProcessConstraints(processConstraintsObj) {
    const processConstraints = {};

    const { hardConstraints } = processConstraintsObj;
    if (hardConstraints) {
      if (hardConstraints.length > 0) {
        processConstraints['proceed:hardConstraints'] =
          this.convertHardConstraints(hardConstraints);
      }
    }

    const { softConstraints } = processConstraintsObj;
    if (softConstraints) {
      if (softConstraints.length > 0) {
        processConstraints['proceed:softConstraints'] =
          this.convertSoftConstraints(softConstraints);
      }
    }

    return processConstraints;
  },

  /**
   * Converts a copy of a given hardConstraints element to the layout needed by fast-xml-parser and returns it
   *
   * @param {array} hardConstraintsArray array containing all hardConstraints of the constraint
   * @returns {object} - the converted copy
   */
  convertHardConstraints(hardConstraintsArray) {
    const hardConstraintsObject = {};

    const constraintArray = [];
    const constraintGroupArray = [];

    hardConstraintsArray.forEach((el) => {
      if (el._type === 'hardConstraint') {
        constraintArray.push(this.convertHardConstraint(el));
      } else {
        constraintGroupArray.push(this.convertConstraintGroup(el));
      }
    });

    if (constraintArray.length === 1) {
      [hardConstraintsObject['proceed:hardConstraint']] = constraintArray;
    } else if (constraintArray.length > 1) {
      hardConstraintsObject['proceed:hardConstraint'] = constraintArray;
    }

    if (constraintGroupArray.length === 1) {
      [hardConstraintsObject['proceed:constraintGroup']] = constraintGroupArray;
    } else if (constraintGroupArray.length > 1) {
      hardConstraintsObject['proceed:constraintGroup'] = constraintGroupArray;
    }

    return hardConstraintsObject;
  },

  /**
   * Converts a copy of a given hardConstraint to the layout needed by fast-xml-parser and returns it
   *
   * @param {object} hardConstraintObj the object that has to be converted
   * @returns {object} - the converted copy
   */
  convertHardConstraint(hardConstraintObj) {
    let copy = { ...hardConstraintObj };

    copy.condition = this.convertCondition(copy.condition);

    copy['proceed:name'] = copy.name;
    delete copy.name;

    copy['proceed:condition'] = copy.condition;
    delete copy.condition;

    copy = this.convertValues(copy);

    delete copy._type;

    copy._attributes = this.filterAttributes(copy._attributes);
    if (!copy.attributes) {
      delete copy._attributes;
    }

    if (copy.hardConstraints) {
      if (copy.hardConstraints.length > 0) {
        copy['proceed:hardConstraints'] = this.convertHardConstraints(copy.hardConstraints);
      }
    }
    delete copy.hardConstraints;

    return copy;
  },

  /**
   * Converts a copy of a given constraintGroup to the layout needed by fast-xml-parser and returns it
   *
   * @param {object} constraintGroupObj the object that has to be converted
   * @returns {object} - the converted copy
   */
  convertConstraintGroup(constraintGroupObj) {
    const copy = { ...constraintGroupObj };

    delete copy._type;

    copy._attributes = this.filterAttributes(copy._attributes);
    if (!copy._attributes) {
      delete copy._attributes;
    }

    if (!copy._attributes || !copy._attributes.id) {
      throw new Error('ConstraintGroup element without valid id attribute found.');
    }

    const hardConstraintArray = [];
    const constraintGroupRefArray = [];

    copy.constraintGroup.forEach((el) => {
      if (el._type === 'hardConstraint') {
        hardConstraintArray.push(this.convertHardConstraint(el));
      } else {
        constraintGroupRefArray.push(this.convertConstraintGroupRef(el));
      }
    });

    if (hardConstraintArray.length === 1) {
      [copy['proceed:hardConstraint']] = hardConstraintArray;
    } else if (hardConstraintArray.length > 1) {
      copy['proceed:hardConstraint'] = hardConstraintArray;
    }

    if (constraintGroupRefArray.length === 1) {
      [copy['proceed:constraintGroupRef']] = constraintGroupRefArray;
    } else if (constraintGroupRefArray.length > 1) {
      copy['proceed:constraintGroupRef'] = constraintGroupRefArray;
    }

    delete copy.constraintGroup;

    return copy;
  },

  /**
   * Converts given constraintGroupRef to layout needed by fast-xml-parser
   *
   * @param {object} constraintGroupRefObj
   */
  convertConstraintGroupRef(constraintGroupRefObj) {
    const copy = { ...constraintGroupRefObj };

    const attributes = this.filterAttributes(copy._attributes);
    if (!attributes || !attributes.ref) {
      throw new Error('ConstrainGroupRef element without valid ref attribute found.');
    }

    delete copy._type;

    return copy;
  },

  /**
   * Converts given softConstraintsArray to layout needed by fast-xml-parser
   *
   * @param {array} softConstraintsArray array containing all softConstraint elements
   * @param {object} object containing all softConstraints in the required form
   */
  convertSoftConstraints(softConstraintsArray) {
    const softConstraintsObj = {};

    if (softConstraintsArray.length === 1) {
      softConstraintsObj['proceed:softConstraint'] = this.convertSoftConstraint(
        softConstraintsArray[0]
      );
    } else if (softConstraintsArray.length > 1) {
      const constraintArray = [];
      softConstraintsArray.forEach((el) => {
        constraintArray.push(this.convertSoftConstraint(el));
      });
      softConstraintsObj['proceed:softConstraint'] = constraintArray;
    }

    return softConstraintsObj;
  },

  /**
   * Converts a copy of a softconstraint object to the layout needed for faster-xml-parser and returns it
   *
   * @param {object} softConstraintObj the object that has to be converted
   * @returns {object} - the copy with the converted elements
   */
  convertSoftConstraint(softConstraintObj) {
    const newObject = { ...softConstraintObj };

    const attributes = this.filterAttributes(newObject._attributes);
    if (!attributes) {
      delete newObject._attributes;
    }

    newObject['proceed:name'] = newObject.name;
    delete newObject.name;

    newObject['proceed:condition'] = newObject.condition;
    delete newObject.condition;

    delete newObject._type;

    return newObject;
  },

  /**
   * Converts < and > in conditions to entity references
   *
   * @param {string} condition in form of a string
   * @returns {string} - the condition with entity references for < and > being converted
   */
  convertCondition(condition) {
    let newCondition = condition;

    if (typeof condition === 'string') {
      newCondition = newCondition.replace(/>(=?)/g, '&gt;$1');
      newCondition = newCondition.replace(/<(=?)/g, '&lt;$1');
    }

    return newCondition;
  },

  /**
   * Converts the values entry in the given object back to the layout needed for fast-xml-parser
   *
   * @param {object} object object which contains the values entry that has to be converted
   * @returns {object} - copy of the given object with converted values entry
   */
  convertValues(object) {
    const newObject = { ...object };

    const { values } = newObject;
    if (values.length === 1) {
      newObject['proceed:values'] = { 'proceed:value': this.convertValue(values[0]) };
    } else {
      const valueArray = [];
      values.forEach((el) => {
        valueArray.push(this.convertValue(el));
      });
      newObject['proceed:values'] = { 'proceed:value': valueArray };
    }
    delete newObject.values;

    const valuesAttributes = this.filterAttributes(newObject._valuesAttributes);
    if (valuesAttributes) {
      newObject['proceed:values']._attributes = valuesAttributes;
    }
    delete newObject._valuesAttributes;

    return newObject;
  },

  /**
   * Converts a given value object to a representation that can be serialized by fast-xml-parser
   *
   * @param {object} valueObj an object containing the value and its attributes
   * @returns {string|number|object} - returns a string or number for a value without attributes else it returns an object
   */
  convertValue(valueObj) {
    const _attributes = this.filterAttributes(valueObj._valueAttributes);

    if (!_attributes) {
      return valueObj.value;
    }

    return { '#text': valueObj.value, _attributes };
  },

  /**
   * Filters all attributes from the given object that have a value of null
   *
   * @param {object} attrObject an object with _attributes, _valueAttributes or _valuesAttributes that have to be filtered
   * @returns {object|null} the filtered attributes object or null if it is empty
   */
  filterAttributes(attrObject) {
    const filteredAttributes = { ...attrObject };

    Object.keys(filteredAttributes).forEach((key) => {
      if (filteredAttributes[key] === null) {
        this.logger.debug(`Found attribute ${key} with value null. Omitting from output.`);
        delete filteredAttributes[key];
      }
    });

    if (Object.keys(filteredAttributes).length > 0) {
      return filteredAttributes;
    }

    return null;
  },
};

module.exports = finalToIntermediateJsParser;
