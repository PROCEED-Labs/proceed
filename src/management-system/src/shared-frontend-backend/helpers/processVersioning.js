const {
  toBpmnObject,
  toBpmnXml,
  setDefinitionsVersionInformation,
  getUserTaskFileNameMapping,
  setUserTaskData,
  getDefinitionsVersionInformation,
} = require('@proceed/bpmn-helper');

const { asyncForEach } = require('./javascriptHelpers.js');

const { diff } = require('bpmn-js-differ');

/**
 * Will compare two bpmns to check if both are equal (with possible differences in their versions)
 *
 * @param {string} bpmn
 * @param {string} otherBpmn
 * @returns {boolean}
 */
async function areVersionsEqual(bpmn, otherBpmn) {
  const bpmnObj = await toBpmnObject(bpmn);
  const otherBpmnObj = await toBpmnObject(otherBpmn);

  const {
    version,
    name: versionName,
    description: versionDescription,
    versionBasedOn,
  } = await getDefinitionsVersionInformation(otherBpmnObj);

  // check if the two bpmns were the same if they had the same version information
  await setDefinitionsVersionInformation(bpmnObj, {
    version,
    versionName,
    versionDescription,
    versionBasedOn,
  });

  // compare the two bpmns
  const changes = diff(otherBpmnObj, bpmnObj);
  const hasChanges =
    Object.keys(changes._changed).length ||
    Object.keys(changes._removed).length ||
    Object.keys(changes._added).length ||
    Object.keys(changes._layoutChanged).length;

  return !hasChanges;
}

/**
 * Will remove the version information from a process bpmn so it is usable as an editable version
 *
 * the versionBasedOn attribute of the definitions element is set to the value previously in the version attribute
 *
 * @param {string} bpmn
 */
async function convertToEditableBpmn(bpmn) {
  const bpmnObj = await toBpmnObject(bpmn);

  const { version } = await getDefinitionsVersionInformation(bpmnObj);

  await setDefinitionsVersionInformation(bpmnObj, { versionBasedOn: version });

  const changedFileNames = {};

  const fileNameMapping = await getUserTaskFileNameMapping(bpmnObj);

  await asyncForEach(Object.entries(fileNameMapping), async ([userTaskId, { fileName }]) => {
    if (fileName) {
      const [unversionedName] = fileName.split('-');
      changedFileNames[fileName] = unversionedName;
      await setUserTaskData(bpmnObj, userTaskId, unversionedName);
    }
  });

  return { bpmn: await toBpmnXml(bpmnObj), changedFileNames };
}

module.exports = {
  areVersionsEqual,
  convertToEditableBpmn,
};
