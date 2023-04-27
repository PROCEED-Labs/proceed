const {
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
  getMetaDataFromElement,
  getMilestonesFromElement,
  getResourcesFromElement,
  getLocationsFromElement,
  getMessagingInfoFromElement,
} = require('@proceed/bpmn-helper/');

export function getMilestones({ businessObject }) {
  if (!businessObject) {
    return;
  }

  return getMilestonesFromElement(businessObject);
}

export function getLocations({ businessObject }) {
  if (!businessObject) {
    return;
  }

  return getLocationsFromElement(businessObject);
}

export function getResources({ businessObject }) {
  if (!businessObject) {
    return;
  }

  return getResourcesFromElement(businessObject);
}

/**
 * Gets the id of the process definition of the process called in a callActivity
 *
 * @param {String} callActivityId
 * @returns {String|undefined} - the id of the process definition of the called process
 */
export function getDefinitionsInfoForCallActivity(modeler, callActivityId) {
  const definitions = modeler.getDefinitions();

  try {
    const { definitionId, version } = getTargetDefinitionsAndProcessIdForCallActivityByObject(
      definitions,
      callActivityId
    );
    return { definitionId, version };
  } catch (err) {
    return {};
  }
}

export function getMetaData({ businessObject }) {
  if (!businessObject) {
    return;
  }

  return getMetaDataFromElement(businessObject);
}

export function getMessagingInfo({ businessObject }) {
  if (!businessObject) return;

  return getMessagingInfoFromElement(businessObject);
}

export function getDocumentation({ businessObject }) {
  if (!businessObject) {
    return;
  }

  if (businessObject.documentation) {
    return businessObject.documentation[0].text;
  } else {
    return '';
  }
}
