// import lib for NODE and VUE
let BPMNModdle = require('bpmn-moddle');
if (typeof BPMNModdle !== 'function') BPMNModdle = BPMNModdle.default;
const Constants = require('./constants.js');
const Utils = require('./processUtilities.js');
const Functions = require('./semanticProcessBuilderFunctions.js');

function build(processSettings, processData) {
  let data = {};
  // handle input Data
  let inputSheetNames = Object.keys(processData);
  let bomName = inputSheetNames.find((sheetName) => sheetName.includes('_BOM'));
  data.planeIdCounter = 0;
  data.rootMaterial = bomName.split('_')[0];
  data.bom = processData[bomName];
  data.processSettings = processSettings;
  data.operations = {};
  data.allocations = {};
  // create process template
  data.model = new BPMNModdle();
  data.definitions = data.model.create('bpmn:Definitions', {
    xmlns: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xmlns:bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
    'xmlns:dc': 'http://www.omg.org/spec/DD/20100524/DC',
    'xmlns:di': 'http://www.omg.org/spec/DD/20100524/DI',
  });
  data.process = data.model.create('bpmn:Process', {
    id: data.processSettings.id,
    name: data.processSettings.name,
    processType: data.processSettings.processType,
    isExecutable: data.processSettings.isExecutable,
  });
  data.definitions.get(Constants.NodeTypes.rootElements).push(data.process);
  inputSheetNames.forEach((name) => {
    const material = name.substring(0, name.lastIndexOf('_'));
    const sheet = processData[name];
    if (name.includes('_Operations')) data.operations[material] = sheet;
    else if (name.includes('_Allocations')) data.allocations[material] = sheet;
  });
  createSemanticProcess(data);
  return data;
}

/**
 * Recursive function, which derives the semantic process completely on all levels. The process is derived starting from the final product of the BOM. From the BPMN point of view, the derived starts at the end event.
 * @param {Array} residualBOM - BOM-Array of the branch, that remains to be derived
 * @param {number} iteration - Iteration within the current (sub-)process
 * @param {ModdelElement} predecessor - Reference to the last BPMN element (if existing)
 * @param {ModdelElement} process - LReference current (sub-)process
 * @returns {} Manipulation of the process-model
 */
function createSemanticProcess(
  data,
  residualBOM,
  iteration = 0,
  predecessor,
  process = data.process
) {
  // on first iteration, add final Product
  if (residualBOM === undefined) {
    residualBOM = Utils.addFinalProductToBOM(data);
  }
  // get materilas on current layer of branch
  let currentElement = residualBOM[0];
  let nextLayerElements = [];
  for (let i = 0; i < residualBOM.length; i++) {
    if (residualBOM[i].layer === currentElement.layer + 1) nextLayerElements.push(i);
  }
  let quantityUnit = '';
  if (currentElement.quantity !== 1 || !['PC', 'ST'].includes(currentElement.unit))
    quantityUnit = ' (' + currentElement.quantity + ' ' + currentElement.unit + ')';
  let allocations = data.allocations[currentElement.material];
  let operations = data.operations[currentElement.material];
  // on first iteration of each (sub-)process: create endEvent and prepare for merge at start Event
  if (iteration === 0) {
    process.sourcedElements = [];
    iteration++;
    //draw end event
    predecessor = Utils.createElement(data.model, process, Constants.Event.end, {
      name: 'Production finished for: ' + currentElement.materialName,
    });
  }
  // get task type
  let taskType = Utils.getTaskType(data, iteration, currentElement);
  // on end of dependency chain, stop
  if (
    nextLayerElements.length === 0 ||
    data.processSettings.stopOnMaterialTypes.includes(currentElement.materialType)
  ) {
    taskType = Constants.Task.none;
    let task = Utils.createTask(
      data.model,
      process,
      Constants.TaskNames.source + currentElement.materialName + quantityUnit,
      taskType
    );
    process.sourcedElements.push(task);
    Utils.createFlow(data.model, process, task, predecessor);
    return;
  }
  // ON CONCURRENT DERIVATIONS
  if (data.processSettings.concurrentTasks || allocations !== undefined) {
    // if subprocess requiered, stop on curent subprocess-level and create new subprocess
    if (taskType == Constants.Task.subProcess) {
      let task = Utils.createTask(
        data.model,
        process,
        Constants.TaskNames.assemble + currentElement.materialName + quantityUnit,
        taskType
      );
      Utils.createFlow(data.model, process, task, predecessor);
      predecessor = task;
      createSemanticProcess(data, residualBOM, 0, task, task);
      process.sourcedElements.push(task);
      return;
    } else if (iteration !== 1 && data.processSettings.concurrentIntermediateEvent) {
      let task = Utils.createElement(data.model, process, Constants.Event.intermediateThrow, {
        name: currentElement.materialName + ' ready',
      });
      Utils.createFlow(data.model, process, task, predecessor);
      predecessor = task;
    }
    // USE ALLOCATIONS for more accurate derivation, if available
    if (allocations === undefined) {
      // create gateway if more than one component
      if (nextLayerElements.length > 1) {
        let gateway = Utils.createElement(data.model, process, Constants.Gateway.parallel);
        Utils.createFlow(data.model, process, gateway, predecessor);
        predecessor = gateway;
      }
      // create each component
      nextLayerElements.push(residualBOM.length);
      for (let i = 0; i < nextLayerElements.length - 1; i++) {
        let component = residualBOM[nextLayerElements[i]];
        let quantityUnit2 = '';
        if (component.quantity !== 1 || !['PC', 'ST'].includes(component.unit))
          quantityUnit2 = ' (' + component.quantity + ' ' + component.unit + ')';
        let taskName = Constants.TaskNames.combineXY
          .replace('X', component.materialName + quantityUnit2)
          .replace('Y', currentElement.materialName);
        let componentTask = Utils.createTask(data.model, process, taskName, taskType);
        Utils.createFlow(data.model, process, componentTask, predecessor);
        // continue recursive call on next level
        let subTree = residualBOM.slice(nextLayerElements[i], nextLayerElements[i + 1]);
        createSemanticProcess(data, subTree, iteration + 1, componentTask, process);
      }
    } else {
      // get materilas on next lower level
      let nextLevelMaterials = Utils.nextLevelMaterials(
        nextLayerElements,
        residualBOM,
        allocations,
        operations
      );
      // create "ADD INTO"-task for each group
      let lastGrop = nextLevelMaterials.groups[0] + 1;
      nextLevelMaterials.groups.forEach((group, index) => {
        let materialIds = nextLevelMaterials.groupMaterials[group];
        let taskName =
          'ADD ' +
          materialIds
            .map((id) => {
              let component = nextLevelMaterials.components[id];
              let quantityUnit2 = '';
              if (component.quantity !== 1 || !['PC', 'ST'].includes(component.unit))
                quantityUnit2 = ' (' + component.quantity + ' ' + component.unit + ')';

              return component.materialName + quantityUnit2;
            })
            .join(' AND ') +
          ' INTO ' +
          currentElement.materialName;
        let task = Utils.createTask(data.model, process, taskName + quantityUnit, taskType);
        Utils.createFlow(data.model, process, task, predecessor);
        let subAllocations = allocations.filter(
          (alloc) => alloc.operation < lastGrop && alloc.operation >= group
        );
        Utils.addAnnotation(
          data,
          process,
          task,
          nextLevelMaterials.groupOperations[group],
          subAllocations
        );
        // connect via Gateway, except the last one, if last one is single
        if (index == nextLevelMaterials.groups.length - 1 && materialIds.length === 1) {
          predecessor = task;
        } else {
          let gateway = Utils.createElement(data.model, process, Constants.Gateway.parallel);
          Utils.createFlow(data.model, process, gateway, task);
          predecessor = gateway;
        }
        // continue recursive call on next level
        for (let materialId of materialIds) {
          createSemanticProcess(
            data,
            nextLevelMaterials.components[materialId].residualBOM,
            iteration + 1,
            predecessor,
            process
          );
        }
        lastGrop = group;
      });
    }
  }
  // ON SEQUENCIAL DERIVATION
  else {
    // create task
    let task = Utils.createTask(
      data.model,
      process,
      Constants.TaskNames.assemble + currentElement.materialName + quantityUnit,
      taskType
    );
    Utils.createFlow(data.model, process, task, predecessor);
    Utils.addAnnotation(data, process, task, operations, allocations);
    predecessor = task;
    // if subprocess requiered, stop on curent subprocess-level and create new subprocess
    if (taskType == Constants.Task.subProcess) {
      createSemanticProcess(data, residualBOM, 0, task, task);
      process.sourcedElements.push(task);
    } else {
      // create gateway if more than one component
      if (nextLayerElements.length > 1) {
        // draw gateway if needed
        let gateway = Utils.createElement(data.model, process, Constants.Gateway.parallel);
        Utils.createFlow(data.model, process, gateway, predecessor);
        predecessor = gateway;
      }
      // create each component
      nextLayerElements.push(residualBOM.length);
      for (let i = 0; i < nextLayerElements.length - 1; i++) {
        let subTree = residualBOM.slice(nextLayerElements[i], nextLayerElements[i + 1]);
        // continue recursive call on next level
        createSemanticProcess(data, subTree, iteration + 1, predecessor, process);
      }
    }
  }
  // at the end of each (sub-)process creation: merge all flows into Gateway / start Event
  if (iteration === 1) {
    Utils.mergeIntoStartEvent(data, process);
  }
}
module.exports = {
  build,
};
