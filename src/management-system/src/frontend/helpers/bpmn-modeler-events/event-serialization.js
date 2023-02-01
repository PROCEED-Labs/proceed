/**
 * Transforms the given context into a JSON serializable form
 * this form contains everything to restore the information on another client to apply the event in the same way
 *
 * @param {string} command the command that is supposed to be executed on another machine
 * @param {object} context the information needed to execute the command
 * @returns {object} - the transformed context
 */
export function preSerialize(command, context) {
  const preSerializedContext = {};
  // prevent sending a force distribution flag to the other clients or we will get an infinite loop
  context.forceDistribution = false;
  // transform the different entries of the context into a form that allows to reproduce the original form on another device
  // e.g. local objects can't be just serialized => replace with object id and then find the object by id on the other device
  Object.entries(context).forEach(([key, info]) => {
    switch (key) {
      // replace all shapes with their ids
      case 'shapes':
        preSerializedContext.shapes = info.map((shape) => shape.id);
        break;
      // allow creation of similar new Root by sending expected type and id
      case 'newRoot':
        preSerializedContext.newRoot = { type: info.type };
        preSerializedContext.newRoot.businessObject = { id: info.id };
        break;
      case 'connection':
        if (command === 'connection.create') {
          // allow creation of similar new connection by sending expected type and id
          preSerializedContext.connection = { type: info.type, id: info.id };
          break;
        }
      // fall through to replacing the connection with its id
      case 'newData':
      case 'shape':
        if (command === 'shape.create' || command === 'shape.replace') {
          // allow creation of similar new shape by sending expected type and all necessary aditional information
          preSerializedContext[key] = {
            type: info.type,
            x: info.x,
            y: info.y,
            height: info.height,
            width: info.width,
            isExpanded: info.isExpanded, // needed for subProcesses
            businessObject: {
              id: info.id,
              cancelActivity: info.businessObject.cancelActivity, // needed for boundary events
              triggeredByEvent: info.businessObject.triggeredByEvent, // needed for event subProcesses
              placeholder: info.businessObject.placeholder,
            },
          };
          if (info.isExpanded === false) {
            preSerializedContext[key].collapsed = true; // needed for creation of collapsed subProcesses
          }
          if (info.businessObject) {
            preSerializedContext[key].businessObject.name = info.businessObject.name;
            if (info.businessObject.processRef) {
              preSerializedContext[key].processRef = info.businessObject.processRef.id; // needed for participants
            }
            if (info.businessObject.dataObjectRef) {
              preSerializedContext.dataObjectId = info.businessObject.dataObjectRef.id;
            }
            if (
              info.businessObject.eventDefinitions &&
              info.businessObject.eventDefinitions.length
            ) {
              preSerializedContext[key].eventDefinitionType = // needed for startEvents, boundaryEvents, endEvents
                info.businessObject.eventDefinitions[0].$type;
              preSerializedContext.eventDefinitionId = info.businessObject.eventDefinitions[0].id;
            }
            if (info.di && preSerializedContext[key].isExpanded === undefined) {
              preSerializedContext[key].isExpanded = info.di.isExpanded; // needed for subProcesses
            }
            if (info.type === 'bpmn:Lane') {
              preSerializedContext.laneSetId = info.businessObject.$parent.id;
            }
            // for when we replace a non subProcess typed activity with a collapsed/expanded subProcess => startEvent implicitly created
            // we need to make sure the start event gets the correct id on other clients
            if (info.businessObject.flowElements && info.businessObject.flowElements.length === 1) {
              if (info.businessObject.flowElements[0].$type === 'bpmn:StartEvent') {
                preSerializedContext.subProcessStartEventId =
                  info.businessObject.flowElements[0].id;
              }
            }
          }
          break;
        }
      // replace all of the following with their id
      case 'rootElement':
      case 'source':
      case 'target':
        if (info.businessObject.properties) {
          preSerializedContext.targetPropertyIds = info.businessObject.properties.map(
            (property) => property.id
          );
        }
      case 'newSource':
      case 'newTarget':
      case 'oldShape':
      case 'newParent':
      case 'element':
        // if we change the id we have to make sure to send the old id of the element to change
        if (command === 'element.updateProperties' && context.properties.id) {
          preSerializedContext.element = context.oldProperties.id;
          break;
        }
      case 'host':
        if (!info) {
          break;
        }
      case 'parent':
        preSerializedContext[key] = info.id;
        break;
      case 'properties':
        preSerializedContext[key] = {};
        Object.entries(info).forEach(([propertyKey, propertyValue]) => {
          if (propertyValue && typeof propertyValue === 'object' && propertyValue.id) {
            preSerializedContext[key][propertyKey] = { id: propertyValue.id };
          } else {
            preSerializedContext[key][propertyKey] = propertyValue;
          }
        });
        break;
      // everything else can just be serialized
      default:
        preSerializedContext[key] = info;
        break;
    }
  });

  return preSerializedContext;
}

/**
 * Transforms the serialized context back into a form that we can use to trigger an event similar to the original one
 *
 * @param {object} elementRegistry gives us functions to get elements in the modeler (shapes, processes, sequence flows)
 * @param {object} elementFactory gives us functions to create modeler elements
 * @param {object} bpmnFactory gives us functions to create the businessObjects of modeler elements
 * @param {object} command the command we will execute
 * @param {object} context the serialized context
 * @returns {object} - the restored context
 */
export function parse(elementRegistry, elementFactory, bpmnFactory, command, context) {
  const parsedContext = {};

  // restore every context entry to a usable form
  Object.entries(context).forEach(([key, info]) => {
    switch (key) {
      // replace the ids for all shapes with the correct shapes
      case 'shapes':
        parsedContext.shapes = info.map((id) => elementRegistry.get(id));
        break;
      // create a new Root with the correct attributes
      case 'newRoot':
        const bO = bpmnFactory.create(info.type, info.businessObject);
        parsedContext.newRoot = elementFactory.createRoot({ ...info, businessObject: bO });
        break;
      case 'connection':
        if (command === 'connection.create') {
          // create a new connection with the correct attributes

          const businessObject = bpmnFactory.create(info.type, { id: info.id });
          parsedContext.connection = elementFactory.createConnection({ ...info, businessObject });

          if (context.changedBySubprocessId) {
            const element = elementRegistry.get(context.changedBySubprocessId);
            if (element && element.type !== 'bpmn:Process') {
              parsedContext.connection.hidden = true;
            }
          }

          break;
        }
      // fall through to getting the existing connection by id
      case 'newData':
      case 'shape':
        if (command === 'shape.create' || command === 'shape.replace') {
          // create a new shape with the correct attributes
          const businessObject = bpmnFactory.create(info.type, info.businessObject);
          parsedContext[key] = elementFactory.createShape({ ...info, businessObject });
          if (info.processRef) {
            // we want to create a new participant with the correct referenced process (same id as original one)
            const process = bpmnFactory.create('bpmn:Process', {
              id: info.processRef,
            });
            parsedContext[key].businessObject.processRef = process;
          }

          if (context.changedBySubprocessId) {
            const element = elementRegistry.get(context.changedBySubprocessId);
            if (element && element.type !== 'bpmn:Process') {
              parsedContext[key].hidden = true;
            }
          }
          break;
        }
      // fall through to getting the existing element by id
      case 'rootElement':
      case 'source':
      case 'target':
      case 'newSource':
      case 'newTarget':
      case 'oldShape':
      case 'newParent':
      case 'element':
      case 'host':
        if (!info) {
          break;
        }
      case 'parent':
        // get modeler element by id
        parsedContext[key] = elementRegistry.get(info);
        break;
      case 'newShape':
        break;
      case 'properties':
        parsedContext[key] = {};
        Object.entries(info).forEach(([propertyKey, propertyValue]) => {
          if (propertyValue && typeof propertyValue === 'object' && propertyValue.id) {
            parsedContext[key][propertyKey] = elementRegistry.get(propertyValue.id).businessObject;
          } else {
            parsedContext[key][propertyKey] = propertyValue;
          }
        });
        break;
      // everything else was just serialized and can be used as is
      default:
        parsedContext[key] = info;
        break;
    }
  });

  return parsedContext;
}
