const { setProceedElement } = require('@proceed/bpmn-helper');

const {
  getLocations,
  getMilestones,
  getResources,
} = require('@/frontend/helpers/bpmn-modeler-events/getters.js');

const { deepEquals } = require('@/shared-frontend-backend/helpers/javascriptHelpers.js');

function UpdateProceedElementsHandler(elementRegistry, moddle) {
  this.elementRegistry = elementRegistry;
  this.moddle = moddle;
}

UpdateProceedElementsHandler.$inject = ['elementRegistry', 'moddle'];

module.exports = UpdateProceedElementsHandler;

UpdateProceedElementsHandler.prototype.setMetaData = function (element, metaData) {
  const oldMetaData = {};

  for (let key in metaData) {
    let value = null,
      attributes;

    if (metaData[key]) {
      if (typeof metaData[key] === 'object') {
        ({ value, attributes } = metaData[key]);
      } else {
        value = metaData[key];
      }
    }
    oldMetaData[key] = setProceedElement(element.businessObject, key, value, attributes);
  }

  return oldMetaData;
};

UpdateProceedElementsHandler.prototype.setMessaging = function (element, messaging) {
  const oldMessaging = {};

  for (let key in messaging) {
    oldMessaging[key] = setProceedElement(element.businessObject, key, messaging[key], {});
  }

  return oldMessaging;
};

function isAChange(element, elementList) {
  const listElement = elementList.find((lElement) => lElement.id === element.id);

  // the element was changed (added, removed) or updated
  return !listElement || !deepEquals(element, listElement);
}

function getUppercaseType(type) {
  return `${type[0].toUpperCase()}${type.substring(1)}`;
}

UpdateProceedElementsHandler.prototype.setMilestones = function (element, milestones) {
  const oldMilestones = getMilestones(element);

  milestones.forEach((milestone) => {
    if (isAChange(milestone, oldMilestones)) {
      setProceedElement(element.businessObject, 'Milestone', undefined, milestone);
    }
  });

  // remove milestones that do not exist anymore
  oldMilestones.forEach((oldMilestone) => {
    if (!milestones.some((milestone) => milestone.id === oldMilestone.id)) {
      setProceedElement(element.businessObject, 'Milestone', null, { id: oldMilestone.id });
    }
  });

  return oldMilestones;
};

UpdateProceedElementsHandler.prototype.setLocations = function (element, locations) {
  const oldLocations = getLocations(element);

  // add locations that did not exist before
  Object.entries(locations).forEach(([locationType, locationTypeEntries]) => {
    locationTypeEntries.forEach((location) => {
      if (isAChange(location, oldLocations[locationType])) {
        setProceedElement(element.businessObject, getUppercaseType(locationType), undefined, {
          ...location,
          buildingIds: undefined,
          areaIds: undefined,
          workingPlaceIds: undefined,
        });
      }
    });
  });
  // remove location that don't exist anymore
  Object.entries(oldLocations).forEach(([locationType, locationTypeEntries]) => {
    locationTypeEntries.forEach((oldLocation) => {
      if (!locations[locationType].some((location) => oldLocation.id === location.id)) {
        setProceedElement(element.businessObject, getUppercaseType(locationType), null, {
          id: oldLocation.id,
        });
      }
    });
  });

  return oldLocations;
};

UpdateProceedElementsHandler.prototype.setResources = function (element, resources) {
  const oldResources = getResources(element);

  // add resources that did not exist before
  Object.entries(resources).forEach(([resourceType, resourceTypeEntries]) => {
    resourceTypeEntries.forEach((resource) => {
      if (isAChange(resource, oldResources[resourceType])) {
        setProceedElement(
          element.businessObject,
          getUppercaseType(resourceType),
          undefined,
          resource
        );
      }
    });
  });
  // remove resources that don't exist anymore
  Object.entries(oldResources).forEach(([resourceType, resourceTypeEntries]) => {
    resourceTypeEntries.forEach((oldResource) => {
      if (!resources[resourceType].some((resource) => oldResource.id === resource.id)) {
        setProceedElement(
          element.businessObject,
          getUppercaseType(resourceType),
          null,
          oldResource
        );
      }
    });
  });

  return oldResources;
};

UpdateProceedElementsHandler.prototype.execute = function (context) {
  const { elementId, milestones, metaData, resources, locations, messaging } = context;

  if (!elementId) {
    throw new Error('Element id required');
  }

  const element = this.elementRegistry.get(elementId);

  if (!element) {
    throw new Error(`Could not find element with id ${elementId}.`);
  }

  if (metaData) {
    context.oldMetaData = this.setMetaData(element, metaData);
  }

  if (milestones) {
    context.oldMilestones = this.setMilestones(element, milestones);
  }

  if (locations) {
    context.oldLocations = this.setLocations(element, locations);
  }

  if (resources) {
    context.oldResources = this.setResources(element, resources);
  }

  if (messaging) {
    context.oldMessaging = this.setMessaging(element, messaging);
  }

  context.element = element;
};

UpdateProceedElementsHandler.prototype.revert = function (context) {
  const { oldMetaData, oldMilestones, oldLocations, oldResources, oldMessaging, element } = context;

  if (oldMetaData) {
    this.setMetaData(element, oldMetaData);
  }

  if (oldMilestones) {
    this.setMilestones(element, oldMilestones);
  }

  if (oldLocations) {
    this.setLocations(element, oldLocations);
  }

  if (oldResources) {
    this.setResources(element, oldResources);
  }

  if (oldMessaging) {
    this.setMessaging(element, oldMessaging);
  }
};
