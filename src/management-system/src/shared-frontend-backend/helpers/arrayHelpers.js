/**
 * Takes an array of strings and returns a string that lists all entries separated by commas and an "and"
 *
 * e.g.
 *
 * [entry] => "[entry]";
 * [entry 1, entry 2] => "[entry 1] and [entry 2]"
 * [entry 1, entry 2, ..., entry n] => "[entry 1], [entry 2], ..., [entry n-1] and [entry n]"
 *
 * @param {String[]} array the array of strings to convert
 * @param {Number} [cutoff] the maximum number of elements that will be enumerated (if there are more a "and x more" will be appended to the string)
 * @returns {String} the string listing the entries of the array
 */
function toListString(array, maxEnumerations = array.length) {
  // we want to at least enumerate a single entry
  maxEnumerations = maxEnumerations < 1 ? 1 : maxEnumerations;

  if (!array.length) {
    return '';
  }

  let listString = array[0];

  array.slice(1, maxEnumerations).forEach((entry, index) => {
    if (index === maxEnumerations - 2) {
      listString += ` and ${entry}`;
    } else {
      listString += `, ${entry}`;
    }
  });

  if (maxEnumerations < array.length) {
    const additionalElementNumber = array.length - maxEnumerations;

    listString += ` + ${additionalElementNumber} more`;
  }

  return listString;
}

function findLast(array, cb) {
  for (let i = array.length - 1; i > -1; --i) {
    if (cb(array[i])) return array[i];
  }

  return undefined;
}

module.exports = { toListString, findLast };
