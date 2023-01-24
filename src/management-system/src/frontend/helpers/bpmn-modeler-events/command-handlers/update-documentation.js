function UpdateDocumentationHandler(elementRegistry, moddle) {
  this.elementRegistry = elementRegistry;
  this.moddle = moddle;
}

UpdateDocumentationHandler.$inject = ['elementRegistry', 'moddle'];

module.exports = UpdateDocumentationHandler;

function ensureDocumentation(element) {
  let { documentation } = element.businessObject;

  if (!documentation) {
    element.businessObject.documentation = [];
  }

  return element.businessObject.documentation;
}

function updateDocumentation(documentation, value, moddle) {
  // remember old value for possible revert
  const oldValue = documentation[0];

  if (value) {
    // add new value
    documentation[0] = moddle.create('bpmn:Documentation', { text: value });
  } else {
    documentation[0] = undefined;
  }

  return oldValue;
}

function cleanup(element) {
  const { documentation } = element.businessObject;

  if (!documentation) {
    return;
  }

  // delete all entries of documentation that don't hold information
  const cleanDocumentation = documentation.filter((entry) => entry);

  if (cleanDocumentation.length) {
    element.businessObject.documentation = cleanDocumentation;
  } else {
    delete element.businessObject.documentation;
  }
}

UpdateDocumentationHandler.prototype.execute = function (context) {
  const { elementId, documentation } = context;

  if (!elementId) {
    throw new Error('Element id required');
  }

  const element = this.elementRegistry.get(elementId);

  if (!element) {
    throw new Error(`Could not find element with id ${elementId}.`);
  }

  const documentationArr = ensureDocumentation(element);

  const oldDocumentation = updateDocumentation(documentationArr, documentation, this.moddle);

  context.oldDocumentation = oldDocumentation;
  context.element = element;

  cleanup(element);
};

UpdateDocumentationHandler.prototype.revert = function (context) {
  const { oldDocumentation, element } = context;

  const documentationArr = ensureDocumentation(element);

  documentationArr[0] = oldDocumentation;

  cleanup(element);
};
