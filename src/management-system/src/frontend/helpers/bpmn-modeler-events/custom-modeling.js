const UpdateDefinitionsCommandHandler = require('./command-handlers/update-definitions-command-handler.js');
const UpdateCalledProcessHandler = require('./command-handlers/update-called-process.js');
const AddScriptHandler = require('./command-handlers/add-script-handler.js');
const UpdateDocumentationHandler = require('./command-handlers/update-documentation.js');
const UpdateEventDefinitionHandler = require('./command-handlers/update-event-definition.js');
const UpdateProceedDataHandler = require('./command-handlers/update-proceed-data');

const ConstraintParser = require('@proceed/constraint-parser-xml-json');
const constraintParser = new ConstraintParser();

const {
  toBpmnObject,
  getElementsByTagName,
  getUserTaskImplementationString,
  generateUserTaskFileName,
} = require('@proceed/bpmn-helper/');

/**
 * This module provides functionality for different custom use cases for our bpmn js modeler
 */
class CustomModeling {
  constructor(elementRegistry, moddle, canvas, commandStack) {
    this.elementRegistry = elementRegistry;
    this.moddle = moddle;
    this.canvas = canvas;
    this.commandStack = commandStack;

    commandStack.registerHandler('definitions.updateProperties', UpdateDefinitionsCommandHandler);
    commandStack.registerHandler('element.updateCalledProcess', UpdateCalledProcessHandler);
    commandStack.registerHandler('element.updateScript', AddScriptHandler);
    commandStack.registerHandler('element.updateDocumentation', UpdateDocumentationHandler);
    commandStack.registerHandler('element.updateEventDefinition', UpdateEventDefinitionHandler);
    commandStack.registerHandler('element.updateProceedData', UpdateProceedDataHandler);
  }

  /**
   * Adds the given constraints to the extensionElements of the given modeler element
   *
   * @param {Object} element the modeler element we want to add the constraints to
   * @param {Object} cons the constraints we want to add
   */
  async addConstraintsToElement(element, cons, dontPropagate = false) {
    let extensionElements;

    // get the already existing extensionElements or create a new one
    if (element.businessObject.extensionElements) {
      ({ extensionElements } = element.businessObject);
    } else {
      extensionElements = this.moddle.create('bpmn:ExtensionElements');
      extensionElements.values = [];
    }

    // remove old constraints
    extensionElements.values = extensionElements.values.filter(
      (el) => el.$type !== 'proceed:ProcessConstraints'
    );

    if (cons) {
      const { hardConstraints, softConstraints } = cons;
      const constraints = { processConstraints: { hardConstraints, softConstraints } };

      // parse constraints into xml to be able to use bpmn-moddle to create expected object from xml
      let constraintXML = constraintParser.fromJsToXml(constraints);
      constraintXML = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn2:extensionElements xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:proceed="https://docs.proceed-labs.org/BPMN">
        ${constraintXML}
      </bpmn2:extensionElements>`;
      const constraintObj = await toBpmnObject(constraintXML, 'bpmn:ExtensionElements');

      // if there are constraints add them to the extensionsElement, (one entry is the type)
      if (Object.keys(constraintObj.values[0]).length > 1) {
        extensionElements.values.push(constraintObj.values[0]);
      }
    }

    // if the extensionElements aren't empty => add them to the element
    if (extensionElements.values.length === 0) {
      extensionElements = undefined;
    }

    this.commandStack.execute('element.updateProperties', {
      element,
      properties: { extensionElements },
      additionalInfo: { constraints: cons },
      isExternalEvent: true,
      dontPropagate,
    });
  }
  /**
   * Adds the given milestones to the extensionElements of the given modeler element
   *
   * @param {Object} element the modeler element we want to add the milestones to
   * @param {Object} milestones the milestones we want to add
   */
  async addMilestonesToElement(element, milestones) {
    this.commandStack.execute('element.updateProceedData', {
      elementId: element.id,
      milestones,
    });
  }

  /**
   * Adds the given locations to the extensionElements of the given modeler element
   *
   * @param {Object} element the modeler element we want to add the locations to
   * @param {Object} locations the locations we want to add
   */
  async addLocationsToElement(element, locations) {
    this.commandStack.execute('element.updateProceedData', {
      elementId: element.id,
      locations,
    });
  }

  /**
   * Adds the given resources to the extensionElements of the given modeler element
   *
   * @param {Object} element the modeler element we want to add the resources to
   * @param {Object} resources the resources we want to add
   */
  async addResourcesToElement(element, resources) {
    this.commandStack.execute('element.updateProceedData', {
      elementId: element.id,
      resources,
    });
  }

  /**
   * Adds process and task constraints as extension elements to the process after checking for inconsistencies
   * @param processConstraints
   * @param taskConstraintMapping
   */
  async addConstraints(processConstraints, taskConstraintMapping) {
    const promises = [];
    if (processConstraints) {
      const process = this.canvas.getRootElement();
      promises.push(this.addConstraintsToElement(process, processConstraints));
    }

    if (taskConstraintMapping) {
      const taskIds = Object.keys(taskConstraintMapping);

      promises.concat(
        taskIds.map(async (id) => {
          const task = this.elementRegistry.get(id);
          if (!task) {
            return;
          }
          await this.addConstraintsToElement(task, taskConstraintMapping[id]);
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Add meta information of the called bpmn process to the modeler bpmn where it's getting called from. This includes a custom namespace in the definitions part,
   * an import element as first child of definitions and the calledElement attribute of the call activity bpmn element
   *
   * @param {String} callActivityId The ID of the call activity bpmn element inside the rootBpmn
   * @param {String} calledBpmn The bpmn file of the called process
   * @param {String} calledProcessLocation The definitionId of the calledBpmn.
   */
  async addCallActivityReference(callActivityId, calledBpmn, calledProcessLocation) {
    // Retrieving all necessary informations from the called bpmn
    const calledBpmnObject = await toBpmnObject(calledBpmn);
    const [calledBpmnDefinitions] = getElementsByTagName(calledBpmnObject, 'bpmn:Definitions');
    const [calledProcess] = getElementsByTagName(calledBpmnObject, 'bpmn:Process');
    const calledProcessTargetNamespace = calledBpmnDefinitions.targetNamespace;

    this.commandStack.execute('element.updateCalledProcess', {
      elementId: callActivityId,
      calledProcessId: calledProcess.id,
      calledProcessName: calledBpmnDefinitions.name,
      calledProcessTargetNamespace,
      calledProcessLocation,
      calledProcessDefinitionsId: calledBpmnDefinitions.id,
    });
  }

  /**
   * Remove the reference to the called process added in {@link addCallActivityReference} but remains the actual bpmn element
   *
   * @param {String} callActivityId The ID of the bpmn element for which the meta information should be removed
   * @param {Boolean} noDistribution if this event should not be distributed to other machines
   */
  removeCallActivityReference(callActivityId, noDistribution) {
    // remove calledElement from callActivity
    this.commandStack.execute('element.updateCalledProcess', {
      elementId: callActivityId,
      isExternalEvent: noDistribution,
    });
  }

  addJSToElement(elementId, script) {
    this.commandStack.execute('element.updateScript', {
      elementId,
      script,
    });
  }

  setUserTaskFileName(taskId, fileName) {
    const userTask = this.elementRegistry.get(taskId);

    if (!userTask) {
      return;
    }

    this.commandStack.execute('element.updateProperties', {
      element: userTask,
      properties: { fileName, implementation: getUserTaskImplementationString() },
    });
  }

  setName(newName) {
    this.commandStack.execute('definitions.updateProperties', {
      properties: { name: newName },
    });
  }

  setBasedOnVersion(version, isExternalEvent) {
    this.commandStack.execute('definitions.updateProperties', {
      properties: { versionBasedOn: version },
      isExternalEvent,
    });
  }

  updateMetaData(elementId, metaData) {
    this.commandStack.execute('element.updateProceedData', {
      elementId,
      metaData,
    });
  }

  updateDocumentation(elementId, documentation) {
    this.commandStack.execute('element.updateDocumentation', {
      elementId,
      documentation,
    });
  }

  updateTimerDuration(elementId, durationFormalExpression) {
    this.commandStack.execute('element.updateEventDefinition', {
      elementId,
      durationFormalExpression,
    });
  }

  updateTimerDate(elementId, dateFormalExpression) {
    this.commandStack.execute('element.updateEventDefinition', {
      elementId,
      dateFormalExpression,
    });
  }

  updateErrorOrEscalation(elementId, refId, label) {
    this.commandStack.execute('element.updateEventDefinition', {
      elementId,
      refName: label,
      refId,
    });
  }

  changeUserTasksImplementation(use5thIndustry) {
    // set every user task implementation to the given implementation
    const userTasks = this.elementRegistry.filter((element) => element.type === 'bpmn:UserTask');

    userTasks.forEach((userTask) => {
      const { businessObject } = userTask;

      if (use5thIndustry) {
        // retain old idOrder if there is one
        this.setUserTaskImplementation(userTask.id, '5thIndustry');
      } else {
        // retain old fileName if there is one or generate new one if there isn't
        this.setUserTaskFileName(
          userTask.id,
          businessObject.fileName || generateUserTaskFileName()
        );
      }
    });
  }

  setUserTaskImplementation(elementId, implementation) {
    const userTask = this.elementRegistry.get(elementId);

    if (!userTask) {
      return;
    }

    this.commandStack.execute('element.updateProperties', {
      element: userTask,
      // make sure the property change is transmitted
      properties: { implementation },
    });
  }

  /**
   * Sets external value on a task
   *
   * @param {Object} element the element to change
   * @param {Boolean} external if the task is supposed to be external
   */
  async setTaskExternal(element, external) {
    this.commandStack.execute('element.updateProperties', {
      element,
      properties: { external: external || null },
    });
  }
}

CustomModeling.$inject = ['elementRegistry', 'moddle', 'canvas', 'commandStack'];

module.exports = {
  __init__: ['customModeling'],
  customModeling: ['type', CustomModeling],
};
