const { getRootFromElement } = require('@proceed/bpmn-helper');

function UpdateDefinitionsHandler(canvas) {
  this.canvas = canvas;
}

UpdateDefinitionsHandler.$inject = ['canvas'];

module.exports = UpdateDefinitionsHandler;

function getProperties(definitions, propertyNames) {
  return propertyNames.reduce((curr, pName) => {
    curr[pName] = definitions.get(pName);
    return curr;
  }, {});
}

function setProperties(definitions, properties) {
  Object.entries(properties).forEach(([key, value]) => {
    if (value === null) {
      definitions.set(key, undefined);
      return;
    }

    definitions.set(key, value);
  });
}

UpdateDefinitionsHandler.prototype.execute = function (context) {
  const { properties } = context;
  const definitions = getRootFromElement(
    this.canvas.getRootElements().find((el) => el.type === 'bpmn:Process').businessObject
  );

  if (!properties) {
    throw new Error('properties required');
  }

  if (!definitions) {
    throw new Error('could not find process definitions');
  }

  const oldProperties = getProperties(definitions, Object.keys(properties));

  setProperties(definitions, properties);

  context.oldProperties = oldProperties;
  context.changed = [definitions];

  return context.changed;
};

UpdateDefinitionsHandler.prototype.revert = function (context) {
  const { oldProperties, changed } = context;
  const [definitions] = changed;

  setProperties(definitions, oldProperties);
};
