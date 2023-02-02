import { preSerialize, parse } from './event-serialization.js';
import { processInterface } from '@/frontend/backend-api/index.js';

let processDefinitionsId = null;

/**
 * Sets processDefinitionsId which is needed when distributing the event
 *
 * @param {String} pId supposed id of the process inside the modeler
 */
export function setProcessDefinitionsId(pId) {
  processDefinitionsId = pId;
}

let elementRegistry;
let elementFactory;
let bpmnFactory;
let cli;
let modeling;
let canvas;
let commandStack;
let bpmnModeler;

/**
 * Registers the modeler for which we want to distribute and apply the events
 *
 * @param {Object} modeler the modeler
 */
export function registerModeler(modeler) {
  elementRegistry = modeler.get('elementRegistry');
  elementFactory = modeler.get('elementFactory');
  bpmnFactory = modeler.get('bpmnFactory');
  cli = modeler.get('cli');
  modeling = modeler.get('modeling');
  canvas = modeler.get('canvas');
  commandStack = modeler.get('commandStack');
  bpmnModeler = modeler;
}

/**
 * Sets up callbacks that trigger distribution when certain events are encountered in the registered modeler
 */
export function activateDistribution() {
  const propagateEvents = [
    'shape.create',
    'shape.delete',
    'shape.resize',
    'shape.replace',
    'shape.toggleCollapse',
    'connection.create',
    'connection.delete',
    'connection.updateWaypoints',
    'element.updateLabel',
    'element.updateProperties',
    'element.updateScript',
    'element.updateProceedData',
    'element.updateDocumentation',
    'element.updateEventDefinition',
    'elements.move',
    'connection.reconnect',
    'canvas.updateRoot',
    'definitions.updateProperties',
    'element.updateCalledProcess',
  ];

  // stores events we want to send and the ones that are implicitly triggered by them which we dont want to send
  const executionHeap = [];

  // removing the last participant implicitly changes the root from a collaboration to a process
  // remember the new root process id to give it to other clients
  let implicitRootChange;

  bpmnModeler.on('commandStack.preExecute', ({ command, context }) => {
    // check if the event awaiting execution is among the ones we send to other engines
    if (propagateEvents.includes(command)) {
      executionHeap.unshift({ command, context });
    }
  });

  // react to changes and send them to other clients if they are originally from this one
  bpmnModeler.on('commandStack.postExecuted', ({ command, context }) => {
    if (propagateEvents.includes(command)) {
      executionHeap.shift();
    } else {
      return;
    }

    // check if the event was triggered by the local user or was trigerred by the event distribution system
    let wasInjected = context.isExternalEvent;

    if (executionHeap.length > 0) {
      wasInjected = wasInjected || executionHeap[executionHeap.length - 1].context.isExternalEvent;
    }

    //check for an implicit root change and store it
    if (command === 'canvas.updateRoot' && executionHeap.length > 0 && !wasInjected) {
      implicitRootChange = context;
    }

    // if the event was neither triggered by an outside event nor by another event we already sent, send it
    // this check can be overridden by setting a flag in the event
    if ((!wasInjected && !executionHeap.length) || context.forceDistribution) {
      // transform the context into a reproducable form
      const information = preSerialize(command, context);

      //send command and context
      processInterface.broadcastBPMNEvents(processDefinitionsId, command, information);

      // the last particpant of the root collaboration was removed, make the other clients change their root
      // according to how it was done locally (use same id for new root Process)
      if (implicitRootChange) {
        processInterface.broadcastBPMNEvents(
          processDefinitionsId,
          'canvas.updateRoot',
          preSerialize('canvas.updateRoot', implicitRootChange)
        );
        implicitRootChange = null;
      }
    }
  });
}

// stores the process that was the root before we made the root a collaboration
// allows us to reuse it when creating the first participant
let oldRootProcess;

/**
 * Use some modules from the modeler to trigger similar events to the ones coming from other machines inside the local modeler
 *
 * @param {String} command the event that is supposed to be applied
 * @param {Object} context information about the current state and the expected changes
 */
export function applyExternalEvent(command, context) {
  if (!elementRegistry || !cli || !modeling) {
    return;
  }

  // transform the context so we can use it to trigger the event in the local modeler
  context = parse(
    elementRegistry,
    elementFactory,
    bpmnFactory,
    command,
    JSON.parse(JSON.stringify(context))
  );

  // store root process before changing to collaboration to use it in the first particpant that will be created
  if (command === 'canvas.updateRoot') {
    const root = canvas.getRootElements().find((el) => el.type === 'bpmn:Process');
    if (root.type === 'bpmn:Process') {
      oldRootProcess = root;
    }
  }

  // on creating the first participant: set its referenced process to the one that was previously the root process
  if (command === 'shape.create' && context.shape.type === 'bpmn:Participant' && oldRootProcess) {
    context.shape.businessObject.processRef = oldRootProcess.businessObject;
    oldRootProcess = null;
  }

  context.isExternalEvent = true; // mark the event as one that comes from another machine
  commandStack.execute(command, context); // trigger the event in the local modeler

  // workarounds to correct implicitly created objects after the event finished

  // on creating a dataObjectReference a dataObject is implicitly created => set dataObject with correct id
  if (command === 'shape.create' && context.dataObjectId) {
    commandStack.execute('element.updateModdleProperties', {
      element: context.shape,
      moddleElement: context.shape.businessObject.dataObjectRef,
      properties: { id: context.dataObjectId },
      isExternalEvent: true,
    });
  }

  // make sure the eventDefinition has the correct id after it was created
  if ((command === 'shape.create' || command === 'shape.replace') && context.eventDefinitionId) {
    let shape = context.shape;
    if (context.newShape) {
      shape = context.newShape;
    }
    commandStack.execute('element.updateModdleProperties', {
      element: shape,
      moddleElement: shape.businessObject.eventDefinitions[0],
      properties: { id: context.eventDefinitionId },
      isExternalEvent: true,
    });
  }
  // make sure the id of the property the dataInputAssociation points to is correct
  if (command === 'connection.create' && context.targetPropertyIds) {
    const localProperties = context.target.businessObject.properties;
    // the property ids of the local instance of the connection target
    const localPropertyIds = localProperties.map((property) => property.id);
    // find the id the new property is supposed to have
    const newId = context.targetPropertyIds.find((id) => !localPropertyIds.includes(id));

    if (!newId) {
      return;
    }

    // find the id the local porperty got when it was created
    const tmpId = localPropertyIds.find((id) => !context.targetPropertyIds.includes(id));

    const newProperty = localProperties.find((property) => property.id === tmpId);
    commandStack.execute('element.updateModdleProperties', {
      element: context.target,
      moddleElement: newProperty,
      properties: { id: newId },
      isExternalEvent: true,
    });
  }

  // make sure that a implicitly created laneset containing the new lane has the correct id
  if (command === 'shape.create' && context.shape.type === 'bpmn:Lane') {
    context.shape.businessObject.$parent.set('id', context.laneSetId);
  }

  // replacing some activity with an collapsed/expanded subprocess implicitly creates a startEvent inside the subprocess
  // => make sure that this startEvent has the correct id
  if (command === 'shape.replace' && context.subProcessStartEventId) {
    if (
      context.newShape.children.length === 1 &&
      context.newShape.children[0].type === 'bpmn:StartEvent'
    ) {
      commandStack.execute('element.updateProperties', {
        element: context.newShape.children[0],
        properties: { id: context.subProcessStartEventId },
        isExternalEvent: true,
      });
    }
  }
}
