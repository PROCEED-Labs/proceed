/**
 * This module is not part of the MS frontend
 *
 * instead it is part of an additional client that applies all bpmn changes that were done in all clients
 * and then sends the changed bpmn to the backend where it is stored as the single source of truth for all other clients
 */

/* eslint-disable no-console */

import Modeler from 'bpmn-js/lib/Modeler';
import CliModule from 'bpmn-js-cli';
import {
  applyExternalEvent,
  registerModeler,
} from '@/frontend/helpers/bpmn-modeler-events/event-distribution.js';

import { getDocumentation } from '@/frontend/helpers/bpmn-modeler-events/getters.js';
import CustomBehaviourModule from '@/frontend/helpers/bpmn-modeler-events/custom-behaviour.js';
import ProceedAutoResizeProvider from '@/frontend/helpers/override-modules/ProceedAutoResizeProvider.js';
import { connect, request, listen } from '@/frontend/backend-api/ms-api-server/socket.js';
import customSchema from '@proceed/bpmn-helper/customSchema.json';
import processInterface from '../../frontend/backend-api/ms-api-server/process.js';
import eventHandler from '../../frontend/backend-api/event-system/EventHandler.js';

eventHandler.on('processBPMNEvent', ({ processDefinitionsId, type, context }) => {
  applyModelingEvent(processDefinitionsId, type, context);
});

eventHandler.on('processXmlChanged', ({ processDefinitionsId, newXml }) => {
  applyModelingEvent(processDefinitionsId, 'change_xml', { newXml });
});

eventHandler.on('elementConstraintsChanged', ({ processDefinitionsId, elementId, constraints }) => {
  applyModelingEvent(processDefinitionsId, 'change_element_constraints', {
    elementId,
    constraints,
  });
});

let processes;

function registerForUpdates(processDefinitionsId) {
  processInterface.observeProcessEditing(processDefinitionsId);
}

async function registerAsModelingClient() {
  await connect();
  await request('register_modeling_client');
}

registerAsModelingClient();

async function getProcesses() {
  processes = await processInterface.getProcesses(true);
  processes.forEach((process) => {
    registerForUpdates(process.id);
  });
}

getProcesses();

listen('processes_changed', (currProcesses) => {
  processes = currProcesses;
});

listen('process_added', (process) => {
  registerForUpdates(process.id);
  processes.push(process);
});

listen('process_removed', (processDefinitionsId) => {
  processes = processes.filter((process) => process.id !== processDefinitionsId);
});

/**
 * Requests the bpmn xml for a specific process
 *
 * @param {String} processDefinitionsId
 */
async function getBPMN(processDefinitionsId) {
  const [bpmn] = await request('data_getBPMN', processDefinitionsId);
  return bpmn;
}

const modeler = new Modeler({
  container: '#modeler',
  additionalModules: [CliModule, CustomBehaviourModule, ProceedAutoResizeProvider],
  moddleExtensions: {
    proceed: customSchema,
  },
});

const eventBus = modeler.get('eventBus');
const elementRegistry = modeler.get('elementRegistry');
const customModeling = modeler.get('customModeling');

// id of the process description currently imported into the modeler
let modelerProcessDefinitionsId = null;
let newName = undefined;
let newDescription = undefined;
eventBus.on('commandStack.changed', async () => {
  // send changes to the backend where they are stored
  const { xml: newBpmn } = await modeler.saveXML({ format: true });
  modelerXml = newBpmn;

  await processInterface.updateProcessViaWebsocket(modelerProcessDefinitionsId, newBpmn, {
    name: newName,
    description: newDescription,
  });
  newName = undefined;
  newDescription = undefined;
});

eventBus.on('commandStack.definitions.updateProperties.postExecute', ({ context }) => {
  const { properties, oldProperties } = context;

  // mark the name as updated so that the following bpmn update changes the process metadata etc
  if (properties.name && properties.name !== oldProperties.name) {
    newName = properties.name;
  }
});

eventBus.on('commandStack.element.updateDocumentation.postExecute', ({ context }) => {
  const { element } = context;

  if (element.type === 'bpmn:Process') {
    newDescription = getDocumentation(element);
  }
});

modeler.on('commandStack.element.updateLabel.postExecute', async ({ context }) => {
  // if a label gets deleted because its source element is deleted make sure referenced errors and escalations are deleted too
  // the event for this can't be send by the other client because it is triggered as part of the delete event (workarounds for this would lead to other problems)
  if (!context.newLabel) {
    const { businessObject, id: elementId } = context.element;
    if (businessObject.eventDefinitions && businessObject.eventDefinitions.length > 0) {
      const [eventDefinition] = businessObject.eventDefinitions;
      if (
        !context.isExternalEvent &&
        (eventDefinition.$type === 'bpmn:ErrorEventDefinition' ||
          eventDefinition.$type === 'bpmn:EscalationEventDefinition')
      ) {
        // delete the old reference
        customModeling.updateErrorOrEscalation(elementId, '', '');
      }
    }
  }
});

async function importProcess(xml) {
  await modeler.importXML(xml);
}

registerModeler(modeler);

// holds currently queued events to be applied
const modelingEvents = [];
let applyingChanges = false;

let modelerProcess = null;
// the current state of the xml loaded in the modeler
let modelerXml;

// events we fired outside of the modeler
const xmlEvents = ['change_xml'];

const modelerEvents = ['change_element_constraints'];

/**
 * Queues up events to be applied and applies them in sequence if no other instance of the function is already running
 *
 * @param {String} processDefinitionsId
 * @param {String} type the type of event to be applied
 * @param {Object} context information of the current state and the expected result of the event
 */
async function applyModelingEvent(processDefinitionsId, type, context) {
  modelingEvents.push({ processDefinitionsId, type, context });

  // there is already a loop that is applying the changes that are queued up so abort early
  if (applyingChanges) {
    return;
  }
  applyingChanges = true;
  // as long as there are events queued up keep applying them
  while (modelingEvents.length) {
    const { processDefinitionsId: id, type: command, context: info } = modelingEvents.shift();

    if (xmlEvents.includes(command)) {
      let bpmn = modelerXml;
      if (modelerProcessDefinitionsId !== id) {
        bpmn = await getBPMN(id);
      }

      if (command === 'change_xml') {
        bpmn = info.newXml;
      }

      if (modelerProcessDefinitionsId === id) {
        modelerXml = bpmn;
        await importProcess(bpmn);
      }

      await processInterface.updateProcessViaWebsocket(id, bpmn);
    } else {
      if (id !== modelerProcessDefinitionsId) {
        // if the next event is for another process, import the new process and apply the event
        modelerProcessDefinitionsId = id;
        modelerProcess = processes.find((storedProcess) => storedProcess.id === id);

        if (!modelerProcess) {
          continue;
        }

        const bpmn = await getBPMN(id);
        await importProcess(bpmn);
      }

      if (modelerEvents.includes(command)) {
        if (command === 'change_element_constraints') {
          customModeling.addConstraintsToElement(
            elementRegistry.get(info.elementId),
            info.constraints,
          );
        }
      } else {
        applyExternalEvent(command, info);
      }
    }
  }

  applyingChanges = false;
}
