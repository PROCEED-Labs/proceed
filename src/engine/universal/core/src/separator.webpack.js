// Do esm import on prod build -> webpack
// This is for easy development / debugging so we don't need webpack
// eslint-disable-next-line import/no-extraneous-dependencies
//const BPMNModdle = require('esm')(module)('bpmn-moddle').default;
import BPMNModdle from 'bpmn-moddle';

const moddle = new BPMNModdle();

/**
 * Promisizes the conversion from XML to bpmn-moddle
 * @param {string} xml
 * @returns {object} The bpmn-moddle instance
 * @private
 */
function fromXML(xml) {
  return new Promise((resolve, reject) => {
    moddle.fromXML(xml, (err, bpmnModel) => {
      if (err) {
        reject(err);
      } else {
        resolve(bpmnModel);
      }
    });
  });
}

/**
 * Promisizes the conversion from bpmn-moddle to XML
 * @param {object} bpmn
 * @returns {string} The generated XML
 * @private
 */
function toXML(bpmn) {
  return new Promise((resolve, reject) => {
    moddle.toXML(bpmn, (err, xml) => {
      if (err) {
        reject(err);
      } else {
        resolve(xml);
      }
    });
  });
}

/**
 * Return the executable process in the given definition.
 * @param {object} definition The definition with the executable process(es)
 * @returns {object} The executable process
 * @private
 */
function getExecutableProcess(definition) {
  return definition
    .get('rootElements')
    .find((el) => el.$type === 'bpmn:Process' && el.isExecutable === true);
}

/**
 * Create a sequence flow from the `sourceRef` to the `targetRef`.
 * This functions adds the newly created sequnce flow
 * to the respective references as `outgoing` or `incoming` properties.
 * @param {object} sourceRef The source reference for the new sequence flow
 * @param {object} targetRef The target reference for the new sequence flow
 * @returns {object} The newly created sequence flow
 * @private
 */
function createSequenceFlow(sourceRef, targetRef) {
  const seq = moddle.create('bpmn:SequenceFlow', {
    id: String(Math.random()),
    sourceRef,
    targetRef,
  });
  sourceRef.get('outgoing').push(seq);
  targetRef.get('incoming').push(seq);
  return seq;
}

/**
 * Create a subprocess for execution of a single activity
 * wrapped with a start and end event.
 * This method creates all necessary sequence flows between the
 * respective elements.
 * @param {object} bpmnModel The BPMN definition
 * @param {object} startEvent The BPMN start event
 * @param {object} activity The BPMN activity
 * @param {Array<object>} endEvents The BPMN end events
 * @returns {object} The modified BPMN definition
 * @private
 */
function createSubProcess(bpmnModel, startEvent, activity, endEvents) {
  const newProcess = getExecutableProcess(bpmnModel);
  const flowElements = [startEvent, activity, ...endEvents];

  // Add sequence flow from start event to activity
  // Reset, since the original elements refer to other sequence flows
  startEvent.set('outgoing', []);
  activity.set('incoming', []);
  let seq = createSequenceFlow(startEvent, activity);
  flowElements.push(seq);

  // Add sequence flows from activity to end events
  activity.set('outgoing', []);
  endEvents.forEach((endEvent) => {
    endEvent.set('incoming', []);
    seq = createSequenceFlow(activity, endEvent);
    flowElements.push(seq);
  });

  newProcess.set('flowElements', flowElements);
  return bpmnModel;
}

function copyElement(element) {
  const options = Object.assign({}, element);
  delete options.$type;
  return moddle.create(element.$type, options);
}

/**
 * Return the activity and wrapper elements (start and end events) for
 * the given activity id.
 * @param {Array<object>} flowElements The flow elements of the parent process
 * @param {string} activityID The id of the activity we want to extract
 * @returns {Array<object>} The startEvent, activity and end events
 * @private
 */
function getActivityAndWrapperElements(flowElements, activityID) {
  let startEvent;
  let activity;
  if (!activityID) {
    // No ID, fetch the start event and first activity of the process
    startEvent = flowElements.find((el) => el.$type === 'bpmn:StartEvent');
    activity = startEvent.get('outgoing')[0].get('targetRef');
  } else {
    startEvent = moddle.create('bpmn:StartEvent', { id: String(Math.random()) });
    activity = flowElements.find((el) => el.id === activityID);
  }

  // Create an end event for each outgoing
  // sequence flow of the activity.
  const endEvents = [];
  activity.get('outgoing').forEach((seqFlow) => {
    endEvents.push(moddle.create('bpmn:EndEvent', { id: seqFlow.targetRef.id }));
  });

  // Make copies of the elements so we don't alter the original BPMN diagram
  startEvent = copyElement(startEvent);
  activity = copyElement(activity);

  return [startEvent, activity, endEvents];
}

/**
 * @memberof module:@proceed/core
 * @class
 * Separator class that offers functionality to extract subprocesses
 * for each activity in a BPMN diagram.
 */
class BPMNSeparator {
  constructor() {
    this.definition = null;
    this.scaffold = '';
  }

  /**
   * Set the BPMN diagram for the separator to use.
   * @param {string} bpmnXML The BPMN XML
   * @returns {Promise} Resolves when the init was finished
   */
  async setBPMN(bpmnXML) {
    // Parse the BPMN XML
    return fromXML(bpmnXML).then((bpmnModel) => {
      // Store the definition
      this.definition = bpmnModel;
      return this._setScaffold(bpmnXML);
    });
  }

  async getBPMN() {
    return toXML(this.definition);
  }

  /**
   * Extract and store the scaffold to use for every
   * subprocess of this BPMN diagram.
   * @param {string} bpmnXML The original BPMN XML
   * @returns {Promise} Resolves when the scaffold was set
   * @private
   */
  async _setScaffold(bpmnXML) {
    return fromXML(bpmnXML)
      .then((bpmnModel) => {
        bpmnModel.set('diagrams', undefined);
        const process = getExecutableProcess(bpmnModel);
        process.set('flowElements', []);
        return bpmnModel;
      })
      .then((bpmnModel) => toXML(bpmnModel))
      .then((xml) => {
        this.scaffold = xml;
      });
  }

  /**
   * Creates and returns the next subprocess of the original BPMN
   * diagram corresponding to the activity with the given id, or
   * the first activity if none was given.
   * @param {string} endEventID The id of the end event (equal to the id of the next activity)
   * @returns {Promise} Resolves when the next activity subprocess was created
   */
  async next(endEventID) {
    return fromXML(this.scaffold).then(async (bpmnModel) => {
      const flowElements = getExecutableProcess(this.definition).get('flowElements');
      const [startEvent, activity, endEvents] = getActivityAndWrapperElements(
        flowElements,
        endEventID,
      );

      if (activity.$type === 'bpmn:EndEvent') {
        // Return just the end event id (for static deployment)
        // if we reached the end of the BPMN diagram.
        return { bpmn: { id: activity.id } };
      }

      // Create the artificial subprocess
      createSubProcess(bpmnModel, startEvent, activity, endEvents);

      const xml = await toXML(bpmnModel);
      return { bpmn: xml, activity };
    });
  }
}

//exports.default = BPMNSeparator;
export default BPMNSeparator;
