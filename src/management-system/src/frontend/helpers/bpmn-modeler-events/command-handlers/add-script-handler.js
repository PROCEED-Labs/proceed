function AddScriptHandler(elementRegistry, moddle) {
  this.elementRegistry = elementRegistry;
  this.moddle = moddle;
}

AddScriptHandler.$inject = ['elementRegistry', 'moddle'];

module.exports = AddScriptHandler;

function getProperties(businessObject, propertyNames) {
  return propertyNames.reduce((curr, pName) => {
    curr[pName] = businessObject.get(pName);
    return curr;
  }, {});
}

function setProperties(businessObject, properties) {
  Object.entries(properties).forEach(([key, value]) => {
    if (value === null) {
      businessObject.set(key, undefined);
      return;
    }

    businessObject.set(key, value);
  });
}

AddScriptHandler.prototype.execute = function (context) {
  const { elementId, script } = context;

  if (!elementId || typeof elementId !== 'string') {
    throw new Error('Not given a valid element id string!');
  }

  const element = this.elementRegistry.get(elementId);

  if (!element) {
    throw new Error(`Unable to find element with given id (${elementId})!`);
  }

  if (element.type !== 'bpmn:ScriptTask' && element.type !== 'bpmn:SequenceFlow') {
    throw new Error(`Invalid element type for script assignment! Type is ${element.type}`);
  }

  let scriptElement;
  let scriptFormat;
  let oldScriptElement;
  let oldScriptFormat;
  if (element.type === 'bpmn:ScriptTask') {
    ({ script: oldScriptElement, scriptFormat: oldScriptFormat } = getProperties(
      element.businessObject,
      ['script', 'scriptFormat']
    ));
    scriptElement = script;
    scriptFormat = 'application/javascript';
    setProperties(element.businessObject, { script: scriptElement, scriptFormat });
  }

  if (element.type === 'bpmn:SequenceFlow') {
    ({ conditionExpression: oldScriptElement } = getProperties(element.businessObject, [
      'conditionExpression',
    ]));
    scriptElement = this.moddle.create('bpmn:FormalExpression', { body: script });
    setProperties(element.businessObject, { conditionExpression: scriptElement });
  }

  context.oldScriptElement = oldScriptElement;
  context.oldScriptFormat = oldScriptFormat;
  context.scriptElement = scriptElement;
  context.oldScriptFormat = oldScriptFormat;
  context.element = element;
};

AddScriptHandler.prototype.revert = function (context) {
  const { element, oldScriptElement, oldScriptFormat } = context;

  if (element.type === 'bpmn:ScriptTask') {
    setProperties(element.businessObject, {
      script: oldScriptElement,
      scriptFormat: oldScriptFormat,
    });
  }

  if (element.type === 'bpmn:SequenceFlow') {
    setProperties(element.businessObject, { conditionExpression: oldScriptElement });
  }
};
