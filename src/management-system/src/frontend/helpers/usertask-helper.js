import { connection } from '@/frontend/assets/user-task.js';

/**
 * @module helpers
 */

/**
 * @module usertask-helper
 * @memberof module:helpers
 */

/**
 * @typedef {Object} TaskConstraintMapping
 * @property {Constraint[]} softConstraints List of soft constraints
 * @property {Constraint[]} hardConstraints List of hard constraints
 */

/**
 * @typedef {Object} Constraint
 * @property {String} _type
 * @property {Object} _attributes
 * @property {String} name
 * @property {String} condition
 * @property {Object[]} values
 * @property {String} values.value
 * @property {Object} values._valueAttributes
 * @property {Object} _valuesAttributes
 */

/**
 * Compute the task constraint mapping for a UserTask based on the current mapping (if present) and on the given user task html content.
 *
 * @param {TaskConstraintMapping} currentTaskConstraints The constraints which are currently applying for the process
 * @param {String} userTaskHTML The html content of a given user task
 *
 * @returns { {softConstraints: Array, hardConstraints: Array} } The new computed task constraint mapping
 */
export function getUpdatedTaskConstraintMapping(currentTaskConstraints, userTaskHTML) {
  const getCurrentConstraint = (key) => {
    if (currentTaskConstraints && Array.isArray(currentTaskConstraints[key])) {
      return currentTaskConstraints[key];
    } else {
      return [];
    }
  };

  return {
    softConstraints: getCurrentConstraint('softConstraints'),
    hardConstraints: computeHardConstraints(getCurrentConstraint('hardConstraints'), userTaskHTML),
  };
}

/**
 * Compute the hard constraint mapping of a UserTask based on the current mapping (if present) and on the given user task html content.
 *
 * @param {Constraint[]} currentHardConstraints List of the current hard constraints
 * @param {String} userTaskHTML The html content of a given user task
 *
 * @returns {Constraint[]} The new computed hard constraints
 */
function computeHardConstraints(currentHardConstraints, userTaskHTML) {
  /** @type {Constraint[]} */
  let hardConstraints = JSON.parse(JSON.stringify(currentHardConstraints)); // deep copy of currentTaskConstraints
  if (!Array.isArray(hardConstraints)) {
    hardConstraints = [];
  }

  if (isImageInHtml(userTaskHTML)) {
    const currentMappingHasImageConstraint = hardConstraints.some((constraint) =>
      constraintsEquals(constraint, connection)
    );
    if (!currentMappingHasImageConstraint) {
      hardConstraints.push(connection);
    }
  } else {
    // remove current hard constraints which only apply if the user task would has images
    hardConstraints = hardConstraints.filter(
      (constraint) => !constraintsEquals(constraint, connection)
    );
  }

  return hardConstraints;
}

/**
 * Checks if the two given constraints have the name, the condition and all values in common
 *
 * @param {Constraint} con1
 * @param {Constraint} con2
 *
 * @returns {boolean} Equality of the two constraints
 */
function constraintsEquals(con1, con2) {
  if (
    con1.name !== con2.name ||
    con1.condition !== con2.condition ||
    con1.values.length !== con2.values.length
  ) {
    return false;
  }

  const con1MappedValues = con1.values.map((value) => value.value).sort();
  const con2MappedValues = con2.values.map((value) => value.value).sort();

  for (let i = 0; i < con1MappedValues; ++i) {
    if (con1MappedValues[i] !== con2MappedValues[i]) return false;
  }

  return true;
}

/**
 * Checks if a given html string contains images with a src attribute
 *
 * @param {String} html
 *
 * @returns {boolean} Is true if there are images within
 */
function isImageInHtml(html) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(document.getElementsByTagName('img'));
  const pattern = /^((http|https):\/\/)/;
  return images.some((image) => pattern.test(image.getAttribute('src')));
}
