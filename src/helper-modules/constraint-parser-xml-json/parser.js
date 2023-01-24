const fastParser = require('fast-xml-parser');
const intermediateToFinal = require('./intermediateToFinalJsParser');
const finalToIntermediate = require('./finalToIntermediateJsParser');
const { getTaskConstraints } = require('./helper.js');

const sharedOptions = {
  attributeNamePrefix: '',
  attrNodeName: '_attributes',
  ignoreNameSpace: true,
  ignoreAttributes: false,
  parseAttributeValue: true,
  parseNodeValue: true,
  arrayMode: false,
};

const serializerOptions = {
  ...sharedOptions,
  format: true,
  indentBy: '    ',
  supressEmptyNode: true,
};

const defaultLogger = {
  fatal() {},
  error(msg) {
    // eslint-disable-next-line no-undef
    console.error(`Constraint Parser Error: ${msg}`);
  },
  warn(msg) {
    // eslint-disable-next-line no-undef
    console.log(`Constraint Parser Warning: ${msg}`);
  },
  info() {},
  debug(msg) {
    // eslint-disable-next-line no-undef
    console.log(`Constraint Parser Debug Message: ${msg}`);
  },
  trace() {},
};

const J2XParser = fastParser.j2xParser;
const serializer = new J2XParser(serializerOptions);

/**
 * @module @proceed/constraint-parser-xml-json
 */

/**
 * @memberof module:@proceed/constraint-parser-xml-json
 * @class
 *
 * This class transforms the PROCEED process constraints from XML to JSON or vice versa
 *
 */
class ConstraintParser {
  /**
   * A logger that shall be used by the parser
   *
   * @param {object} logger
   */
  constructor(logger) {
    this.setLogger(logger);
  }

  /**
   * Sets logger that shall be used while parsing
   * if the given value is falsey a default logger is used
   *
   * @param {object} logger
   */
  setLogger(logger) {
    if (logger) {
      this.logger = logger;
      intermediateToFinal.logger = logger;
      finalToIntermediate.logger = logger;
    } else {
      this.logger = defaultLogger;
      intermediateToFinal.logger = defaultLogger;
      finalToIntermediate.logger = defaultLogger;
    }
  }

  /**
   * Parses the XML string to return the JS representation of the constraints
   *
   * @param {string} constraintsInXML - the XML respresentation of the constraints
   * @returns {object} - the JS representation of the constraints
   */
  fromXmlToJs(constraintsInXML) {
    if (!constraintsInXML) {
      this.logger.error('Input can not be parsed into JS Constraint object');
      return '';
    }
    let xmlString = constraintsInXML.replace(/>>(=?)</g, '>&gt;$1<');
    xmlString = constraintsInXML.replace(/><(=?)</g, '>&lt;$1<');

    let convertedConstraints = '';
    try {
      const constraints = fastParser.parse(xmlString, sharedOptions);
      convertedConstraints = intermediateToFinal.convertConstraints(constraints);
    } catch (err) {
      this.logger.error(err.message);
    }

    return convertedConstraints;
  }

  /**
   * Parses the XML string to return the JSON representation of the constraints
   *
   * @param {string} constraintsInXML - the XML respresentation of the constraints
   * @returns {string} - the JSON representation of the constraints
   */
  fromXmlToJson(constraintsInXML) {
    if (!constraintsInXML) {
      this.logger.error("Can't parse undefined into JS Constraint object");
      return '';
    }
    return JSON.stringify(this.fromXmlToJs(constraintsInXML));
  }

  /**
   * Parses the JS object to return the XML representation of the constraints
   *
   * @param {object} constraintsInJS - the XML respresentation of the constraints
   * @returns {string} - the XML representation of the constraints
   */
  fromJsToXml(constraintsInJS) {
    if (!constraintsInJS) {
      this.logger.error('Input can not be parser to XML');
      return '';
    }

    let xmlString;
    try {
      const intermediate = finalToIntermediate.convertConstraints(constraintsInJS);
      xmlString = serializer.parse(intermediate);
    } catch (err) {
      this.logger.error(err.message);
      xmlString = '';
    }

    xmlString = xmlString.replace(/\/>/g, ' />');
    return xmlString;
  }

  /**
   * Parses the JSON string to return the XML representation of the constraints
   *
   * @param {string} constraintsInJSON - the XML respresentation of the constraints
   * @returns {string} - the XML representation of the constraints
   */
  fromJsonToXml(constraintsInJSON) {
    if (!constraintsInJSON) {
      return '';
    }
    return this.fromJsToXml(JSON.parse(JSON.stringify(constraintsInJSON)));
  }

  /**
   * Checks if constraint contains multiple values with constraintName of constraintNames-array
   *
   * @param [constraintNames]: machineConstraints or networkConstraints
   * @param {constraint}
   * @returns boolean
   */
  checkForCriticalMultipleValues(constraintNames, constraint) {
    if (
      constraintNames.includes(constraint.name) &&
      constraint.values.length > 1 &&
      constraint._valuesAttributes.conjunction === 'AND'
    ) {
      return true;
    }
    return false;
  }

  /**
   * Checks if every constraintName of constraintNames-array is present in constraints
   *
   * @param [constraintNames]: machineConstraints or networkConstraints
   * @param [constraints]
   * @returns boolean
   */
  checkForCriticalConstraintComposition(constraintNames, constraints) {
    return constraintNames.every((name) => {
      return constraints.some((constraint) => {
        if (constraint._type === 'hardConstraint') {
          return constraint.name === name;
        }
        if (
          constraint._type === 'constraintGroup' &&
          constraint._attributes.conjunction === 'AND'
        ) {
          return constraint.constraintGroup.some((cg) => cg.name === name);
        }
        return false;
      });
    });
  }

  /**
   * checks for circular dependencies and other inconsistencies in hardconstraints
   *
   * errors:
   *  at (easy) circular dependencies,
   *  at AND conjunction of multiple values from machine.id, machine.name, machine.hostname (meaning multiple id)
   * warnings:
   *  at AND conjunction of machine.id, machine.name, machine.hostname
   *  at AND conjunction of multiple values from network.ip4, .ip6, .mac
   *  at AND conjunction of network.ip4, .ip6, .mac
   * @param {constraintsInJS}
   */
  checkConstraintDefinition(constraintsInJS) {
    const machineConstraints = ['machine.id', 'machine.name', 'machine.hostname'];
    const networkConstraints = [
      'machine.network.ip4',
      'machine.network.ip6',
      'machine.network.mac',
    ];

    const checkResultObject = {
      warnings: [],
      errors: [],
    };

    if (!constraintsInJS || !constraintsInJS.hardConstraints) return checkResultObject;

    const constraintGroups = constraintsInJS.hardConstraints.filter(
      (hc) => hc._type === 'constraintGroup'
    );

    constraintsInJS.hardConstraints.forEach((constraint) => {
      if (constraint._type === 'constraintGroup') {
        if (this.searchForCircularDependencies(constraintGroups, constraint._attributes.id, [])) {
          checkResultObject.errors.push(
            `Circular dependency at constraintGroup ${constraint._attributes.id}`
          );
        }
        constraint.constraintGroup.forEach((cg) => {
          if (this.checkForCriticalMultipleValues(machineConstraints, cg)) {
            checkResultObject.errors.push(
              `Multiple values with AND-conjunction for ${cg.name} in constraintGroup ${constraint._attributes.id}`
            );
          } else if (this.checkForCriticalMultipleValues(networkConstraints, cg)) {
            checkResultObject.warnings.push(
              `Multiple values with AND-conjunction for ${cg.name} in constraintGroup ${constraint._attributes.id}`
            );
          }
        });
      } else {
        if (this.checkForCriticalMultipleValues(machineConstraints, constraint)) {
          checkResultObject.errors.push(
            `Multiple values with AND-conjunction for ${constraint.name}`
          );
        } else if (this.checkForCriticalMultipleValues(networkConstraints, constraint)) {
          checkResultObject.warnings.push(
            `Multiple values with AND-conjunction for ${constraint.name}`
          );
        }
      }
    });

    if (
      this.checkForCriticalConstraintComposition(
        machineConstraints,
        constraintsInJS.hardConstraints
      )
    ) {
      checkResultObject.warnings.push(
        'Appearance of machine.id, machine.name and machine.hostname with AND-conjunction'
      );
    }

    if (
      this.checkForCriticalConstraintComposition(
        networkConstraints,
        constraintsInJS.hardConstraints
      )
    ) {
      checkResultObject.warnings.push(
        'Appearance of machine.network.ip4, machine.network.ip6 and machine.network.mac with AND-conjunction'
      );
    }

    return checkResultObject;
  }

  /**
   * Checks for circular dependencies in constraintgroup
   * -> Runs through path of referenced groups and searches for cycle
   *
   * @param {constraintGroups} -> every existing constraint group
   * @param groupId -> group of current point in path
   * @param [referencedGroups] -> groups which got referenced
   * @returns boolean -> Returns true if circular dependency is found
   */
  searchForCircularDependencies(constraintGroups, groupId, referencedGroups) {
    const groupsPath = referencedGroups;
    groupsPath.push(groupId);
    // multiple appearance of group in path -> cycle found
    if (groupsPath.length > new Set(groupsPath).size) return true;

    const group = constraintGroups.find((cg) => cg._attributes.id === groupId);
    if (group === undefined) return true;

    return group.constraintGroup.some((cgElement) => {
      if (cgElement._type === 'constraintGroupRef') {
        return this.searchForCircularDependencies(
          constraintGroups,
          cgElement._attributes.ref,
          groupsPath
        );
      }
      return false;
    });
  }

  /*
   * Validates the XML string if the constraints are correctly serialized
   *
   * @param {string} constraintsInXML - the XML respresentation of the constraints
   * @returns {json} - the JSON representation of the constraints
   */
  /*
  validateXML(constraintsInXML) {
    if (!constraintsInXML) {
      return false;
    }
    // TODO
    return false;
  },
  */

  /**
   * Returns either the process constraints or the constraints of a task in form of an object
   *
   * @param {string} bpmn process definition
   * @param {string|undefined} taskId string: we want constraints of a task, undefined: we want the process constraints
   */
  getConstraints(bpmn, taskId) {
    let convertedConstraints = '';
    try {
      const processObj = fastParser.parse(bpmn, sharedOptions).definitions.process;
      let constraints;
      // we want to know the process constraints
      if (!taskId) {
        if (processObj.extensionElements && processObj.extensionElements.processConstraints) {
          constraints = processObj.extensionElements.processConstraints;
        }
      } else {
        constraints = getTaskConstraints(processObj, taskId);
      }
      if (constraints) {
        convertedConstraints = intermediateToFinal.convertConstraints({
          processConstraints: constraints,
        });
      }
    } catch (err) {
      this.logger.error(err.message);
    }

    return convertedConstraints;
  }
}

module.exports = ConstraintParser;
