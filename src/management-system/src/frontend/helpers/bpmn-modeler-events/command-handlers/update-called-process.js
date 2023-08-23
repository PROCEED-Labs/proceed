const { getRootFromElement } = require('@proceed/bpmn-helper');

function UpdateCalledProcessHandler(elementRegistry, moddle) {
  this.elementRegistry = elementRegistry;
  this.moddle = moddle;
}

UpdateCalledProcessHandler.$inject = ['elementRegistry', 'moddle'];

module.exports = UpdateCalledProcessHandler;
UpdateCalledProcessHandler.prototype.removeCallActivityReference = function (
  context,
  callActivity,
) {
  const { businessObject } = callActivity;

  if (typeof businessObject.calledElement !== 'string') {
    return;
  }

  // deconstruct e.g. 'p3c2324:_e069937f-27b6-464b-b397-b88a2599f1b9' to 'p3c2c324'
  const [prefix] = businessObject.calledElement.split(':');

  const callActivities = this.elementRegistry.filter((el) => {
    return el.type === 'bpmn:CallActivity' && el !== callActivity;
  });

  // remove import and namespace in definitions if there is no other call activity referencing the same process
  if (
    callActivities.every(
      (callActivity) =>
        !callActivity.businessObject.calledElement ||
        !callActivity.businessObject.calledElement.startsWith(prefix),
    )
  ) {
    const definitions = getRootFromElement(businessObject);

    context.oldImportedNamespace = definitions.$attrs[`xmlns:${prefix}`];

    // remove calledElement from callActivity
    delete definitions.$attrs[`xmlns:${prefix}`];

    context.oldImport = definitions.imports.find(
      (importedProcess) => importedProcess.namespace === context.oldImportedNamespace,
    );

    context.oldCalledProcessDefinitionsVersion = context.oldImport.version;

    if (context.oldImport) {
      definitions.imports = definitions.imports.filter(
        (processImport) => processImport !== context.oldImport,
      );
    }
  }

  context.oldCalledElement = businessObject.calledElement;
  context.oldName = businessObject.name;

  businessObject.calledElement = null;
  businessObject.name = null;
};

UpdateCalledProcessHandler.prototype.addCallActivityReference = function (
  context,
  callActivity,
  processId,
  processName,
  targetNamespace,
  processLocation,
) {
  // Construct namespace in format p+(last 3 chars from the imported namespace id part and last 3 from the version part), for example 'p3c2324'
  const [idPart, versionPart] = targetNamespace.split('#');
  const nameSpacePrefix =
    'p' + idPart.substring(idPart.length - 3) + versionPart.substring(versionPart.length - 3);

  const definitions = getRootFromElement(callActivity.businessObject);

  if (!definitions.imports) {
    definitions.imports = [];
  }

  // add import if it doesn't already exist
  if (!definitions.imports.some((imp) => imp.namespace === targetNamespace)) {
    const newImport = this.moddle.create('bpmn:Import', {
      namespace: targetNamespace,
      location: processLocation,
      importType: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
      version: versionPart,
    });

    context.addedImport = newImport;
    definitions.imports.push(newImport);
    definitions.$attrs[`xmlns:${nameSpacePrefix}`] = targetNamespace;
    context.addedNamespace = targetNamespace;
  }

  context.calledProcessDefinitionsVersion = versionPart;

  callActivity.businessObject.calledElement = `${nameSpacePrefix}:${processId}`;
  callActivity.businessObject.name = processName;
};

UpdateCalledProcessHandler.prototype.execute = function (context) {
  let {
    elementId,
    calledProcessId,
    calledProcessName,
    calledProcessTargetNamespace,
    calledProcessLocation,
  } = context;

  if (!elementId || typeof elementId !== 'string') {
    throw new Error('Not given a valid element id string!');
  }

  const element = this.elementRegistry.get(elementId);

  if (!element) {
    throw new Error(`Unable to find element with given id (${elementId})!`);
  }

  if (element.type !== 'bpmn:CallActivity') {
    throw new Error(`Expected element of type callActivity but type was: ${element.type}!`);
  }

  this.removeCallActivityReference(context, element);

  if (calledProcessId) {
    this.addCallActivityReference(
      context,
      element,
      calledProcessId,
      calledProcessName,
      calledProcessTargetNamespace,
      calledProcessLocation,
    );
  }

  context.changed = element;

  return context.changed;
};

UpdateCalledProcessHandler.prototype.revert = function (context) {
  const {
    oldImportedNamespace,
    oldImport,
    oldCalledElement,
    oldName,
    addedImport,
    addedNamespace,
  } = context;

  const definitions = getRootFromElement(context.changed.businessObject);

  if (addedImport) {
    definitions.imports = definitions.imports.filter((imp) => imp !== addedImport);
  }

  if (addedNamespace) {
    const [idPart, versionPart] = addedNamespace.split('#');
    const nameSpacePrefix =
      'p' + idPart.substring(idPart.length - 3) + versionPart.substring(versionPart.length - 3);
    delete definitions.$attrs[`xmlns:${nameSpacePrefix}`];
  }

  if (oldImportedNamespace) {
    const [idPart, versionPart] = oldImportedNamespace.split('#');
    const nameSpacePrefix =
      'p' + idPart.substring(idPart.length - 3) + versionPart.substring(versionPart.length - 3);
    definitions.$attrs[`xmlns:${nameSpacePrefix}`] = oldImportedNamespace;
  }

  if (oldImport) {
    definitions.imports.push(oldImport);
  }

  context.calledProcessDefinitionsVersion = context.oldCalledProcessDefinitionsVersion;
  context.changed.businessObject.calledElement = oldCalledElement;
  context.changed.businessObject.name = oldName;
};
