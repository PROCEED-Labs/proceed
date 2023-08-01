// import lib for NODE and VUE
let BPMNModdle = require('bpmn-moddle');
if (typeof BPMNModdle !== 'function') BPMNModdle = BPMNModdle.default;

class ProcessBuilder {
  /**
   * Constructor create a ProcessBuilder instance with the given paramteter
   * Call build() to generate process
   * @param {Object} processSettings - Configuration object to specify derivation settings
   * @param {string} processSettings.id - Id of the process to be derived (pass through)
   * @param {string} processSettings.name - Name of the process to be derived (pass through)
   * @param {string} processSettings.processType - Visibility of process: Public, Private, None (pass through)
   * @param {boolean} processSettings.isExecutable - Executability of the process (pass through)
   * @param {string} processSettings.taskType - Default type of derived tasks: Task, ManualTask, UserTask (or any other valid Task type in BPMN)
   * @param {boolean} processSettings.concurrentTasks - Indication if a work step can start without all requiered materials ready
   * @param {boolean} processSettings.concurrentIntermediateEvent - Indication if concurrent work steps should end with an intermediate
   * @param {boolean} processSettings.useSubProcesses - Indication if subprocesses should be used
   * @param {string[]} processSettings.subProcessesMaterials - Materilas that should be derived as subprocesses: only valid material-ids (H-699620)
   * @param {string[]} processSettings.textAnnotationsContents - Information that should be included into the annotations: ["Material", "Workplace", "Duration", "Worksteps"]
   * @param {string[]} processSettings.stopOnMaterialTypes - Indication the the derivation shoud not include the manufacotring process of sourced materials of the given type (e.g. RAW, HIBE)
   * @param {string[]} processSettings.elementAlignment - How elements should be aligned behind gatways ('Aligned', 'TOP', 'DOWN', 'Steps')
   *
   * @param {Object} processData - Dynamic data object, containing a SINGLE BOM and ANY NUMBER OF allocation and operation fory any material within the BOM
   * @param {Object[]} processData.XXXXX_BOM - BOM for the material XXXXX
   * @param {string} processData.XXXXX_BOM.material - Material identifier: technical id of the material in the material master data
   * @param {string} processData.XXXXX_BOM.materialName - Material Name: Human readable name of the material
   * @param {number} processData.XXXXX_BOM.layer - Depth of the materila in the BOM
   * @param {string} processData.XXXXX_BOM.materialType - Categroy of material in terms of production state and usage (ROH, HALB, FERT)
   * @param {number} processData.XXXXX_BOM.quantity - Quantity of the component required
   * @param {string} processData.XXXXX_BOM.unit - Measure for the component quantity
   * @param {string} [processData.XXXXX_BOM.category] - Defines how an entry should be interpreted, e.g. as separately registered material (L) or as description for material (T)
   *
   * @param {Object[]} processData.YYYYY_Operations - Operations for the material YYYYY
   * @param {number} processData.YYYYY_Operations.operation - Unique id of operation
   * @param {string} processData.YYYYY_Operations.workCenter - Workplace a action is to be performed on
   * @param {string} processData.YYYYY_Operations.description - Action that is to be performed
   * @param {number} processData.YYYYY_Operations.quantity - Quantity of the component required
   * @param {string} processData.YYYYY_Operations.unit - Measure for the component quantity
   *
   * @param {Object[]} processData.ZZZZZ_Allocations - Allocations for the material ZZZZZ
   * @param {number} processData.ZZZZZ_Allocations.operation - Reference to a operation (unique id of operation)
   * @param {string} processData.ZZZZZ_Allocations.component - Reference to a material (material id / XXXXX_BOM.material)
   * @param {number} processData.ZZZZZ_Allocations.quantity - Quantity of the component required
   * @param {string} processData.ZZZZZ_Allocations.unit - Measure for the component quantity
   * @param {number} [processData.ZZZZZ_Allocations.itemNr] - Unique id of allocation
   * @param {string} [processData.ZZZZZ_Allocations.itemCategory] - Defines how an entry should be interpreted, e.g. as separately registered material (L) or as description for material (T)
   * @param {string} [processData.ZZZZZ_Allocations.materialDescription] - Material Name: Human readable name of the material (XXXXX_BOM.materialName)
   *
   * @returns {ProcessBuilder} Builder Object
   */
  constructor(processSettings, processData) {
    // handle input Data
    let inputSheetNames = Object.keys(processData);
    let bomName = inputSheetNames.find((sheetName) => sheetName.includes('_BOM'));

    this.planeIdCounter = 0;
    this.visualElementOffsetX = 125;
    this.visualElementOffsetY = 110;
    this.rootMaterial = bomName.split('_')[0];
    this.bom = processData[bomName];
    this.processSettings = processSettings;
    this.operations = {};
    this.allocations = {};

    inputSheetNames.forEach((name) => {
      const material = name.substring(0, name.lastIndexOf('_'));
      const sheet = processData[name];

      if (name.includes('_Operations')) this.operations[material] = sheet;
      else if (name.includes('_Allocations')) this.allocations[material] = sheet;
    });

    // create process template
    this.model = new BPMNModdle();
    this.definitions = this.model.create('bpmn:Definitions', {
      xmlns: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xmlns:bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
      'xmlns:dc': 'http://www.omg.org/spec/DD/20100524/DC',
      'xmlns:di': 'http://www.omg.org/spec/DD/20100524/DI',
    });

    this.process = this.model.create('bpmn:Process', {
      id: this.processSettings.id,
      name: this.processSettings.name,
      processType: this.processSettings.processType,
      isExecutable: this.processSettings.isExecutable,
    });
    this.definitions.get(NodeTypes.rootElements).push(this.process);
  }

  /**
   * derives the process from the given data
   * @returns {string} XML string containing eth BPMN process
   */
  async build() {
    this.createSemanticProcess();
    this.createGraphicProcess();

    let process = await this.model.toXML(this.definitions, { format: true });
    return process.xml;
  }

  /**
   * Recursive function, which derives the semantic process completely on all levels.
   * The process is derived starting from the final product of the BOM. From the BPMN point of view, the derived starts at the end event.
   * CAN BE CALLED WITHOUT PARAMETER for first iteration
   *
   * @param {Array} residualBOM - BOM-Array of the branch, that remains to be derived
   * @param {number} iteration - Iteration within the current (sub-)process
   * @param {ModdelElement} predecessor - Reference to the last BPMN element (if existing)
   * @param {ModdelElement} process - LReference current (sub-)process
   * @returns {} Manipulation of the process-model
   */
  createSemanticProcess(residualBOM, iteration = 0, predecessor, process = this.process) {
    // on first iteration, add final Product
    if (residualBOM === undefined) {
      residualBOM = this.bom;
      residualBOM.unshift({
        material: this.rootMaterial,
        materialName: this.rootMaterial,
        quantity: 1,
        unit: 'PC',
        category: 'L',
        layer: 0,
        materialType: 'FERT',
      });
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
    let allocations = this.allocations[currentElement.material];
    let operations = this.operations[currentElement.material];

    // on first iteration of each (sub-)process: create endEvent and prepare for merge at start Event
    if (iteration === 0) {
      process.sourcedElements = [];
      iteration++;

      //draw end event
      predecessor = this.createElement(process, Event.end, {
        name: 'Production finished for: ' + currentElement.materialName,
      });
    }

    // get task type
    let taskType = this.processSettings.taskType;
    if (
      this.processSettings.useSubProcesses &&
      this.processSettings.subProcessesMaterials.length === 0 &&
      iteration % 2 == 0
    )
      taskType = Task.subProcess;
    else if (
      this.processSettings.subProcessesMaterials.includes(currentElement.material) &&
      iteration !== 1
    )
      taskType = Task.subProcess;

    // on end of dependency chain, stop
    if (
      nextLayerElements.length === 0 ||
      this.processSettings.stopOnMaterialTypes.includes(currentElement.materialType)
    ) {
      taskType = Task.none;
      let task = this.createTask(
        process,
        TaskNames.source + currentElement.materialName + quantityUnit,
        taskType
      );
      process.sourcedElements.push(task);
      this.createFlow(process, task, predecessor);
      return;
    }

    // ON CONCURRENT DERIVATIONS
    if (this.processSettings.concurrentTasks || allocations !== undefined) {
      // if subprocess requiered, stop on curent subprocess-level and create new subprocess
      if (taskType == Task.subProcess) {
        let task = this.createTask(
          process,
          TaskNames.assemble + currentElement.materialName + quantityUnit,
          taskType
        );
        this.createFlow(process, task, predecessor);
        predecessor = task;
        this.createSemanticProcess(residualBOM, 0, task, task);
        process.sourcedElements.push(task);
        return;
      } else if (iteration !== 1 && this.processSettings.concurrentIntermediateEvent) {
        let task = this.createElement(process, Event.intermediateThrow, {
          name: currentElement.materialName + ' ready',
        });
        this.createFlow(process, task, predecessor);
        predecessor = task;
      }

      // USE ALLOCATIONS for more accurate derivation, if available
      if (allocations === undefined) {
        // create gateway if more than one component
        if (nextLayerElements.length > 1) {
          let gateway = this.createElement(process, Gateway.parallel);
          this.createFlow(process, gateway, predecessor);
          predecessor = gateway;
        }

        // create each component
        nextLayerElements.push(residualBOM.length);
        for (let i = 0; i < nextLayerElements.length - 1; i++) {
          let component = residualBOM[nextLayerElements[i]];

          let quantityUnit2 = '';
          if (component.quantity !== 1 || !['PC', 'ST'].includes(component.unit))
            quantityUnit2 = ' (' + component.quantity + ' ' + component.unit + ')';

          let taskName = TaskNames.combineXY
            .replace('X', component.materialName + quantityUnit2)
            .replace('Y', currentElement.materialName);
          let componentTask = this.createTask(process, taskName, taskType);
          this.createFlow(process, componentTask, predecessor);

          // continue recursive call on next level
          let subTree = residualBOM.slice(nextLayerElements[i], nextLayerElements[i + 1]);
          this.createSemanticProcess(subTree, iteration + 1, componentTask, process);
        }
      } else {
        // get materilas on next lower level
        let components = {};
        nextLayerElements.push(residualBOM.length);
        for (let i = 0; i < nextLayerElements.length - 1; i++) {
          let component = residualBOM[nextLayerElements[i]];
          component.residualBOM = residualBOM.slice(nextLayerElements[i], nextLayerElements[i + 1]);
          components[component.material] = component;
        }

        // group allocation by requierend materials
        let groups = [...new Set(allocations.map((alloc) => alloc.operation))].sort(
          (a, b) => b - a
        );
        let groupMaterials = {};
        groups.forEach((operation) => {
          groupMaterials[operation] = allocations
            .filter((alloc) => alloc.operation == operation)
            .map((alloc) => alloc.component);
        });

        // group operations by requierend materials
        let groupOperations = {};
        if (operations !== undefined) {
          let groupBounds = [...groups];
          groupBounds[groupBounds.length - 1] = 0;

          let upperBound = Math.max(...operations.map((op) => op.operation)) + 1;
          groupBounds.forEach((lowerBound, index) => {
            groupOperations[groups[index]] = operations.filter(
              (op) => op.operation < upperBound && op.operation >= lowerBound
            );
            upperBound = lowerBound;
          });
        }

        // create "ADD INTO"-task for each group
        let lastGrop = groups[0] + 1;
        groups.forEach((group, index) => {
          let materialIds = groupMaterials[group];
          let taskName =
            'ADD ' +
            materialIds
              .map((id) => {
                let component = components[id];
                let quantityUnit2 = '';
                if (component.quantity !== 1 || !['PC', 'ST'].includes(component.unit))
                  quantityUnit2 = ' (' + component.quantity + ' ' + component.unit + ')';

                return component.materialName + quantityUnit2;
              })
              .join(' AND ') +
            ' INTO ' +
            currentElement.materialName;

          let task = this.createTask(process, taskName + quantityUnit, taskType);
          this.createFlow(process, task, predecessor);

          let subAllocations = allocations.filter(
            (alloc) => alloc.operation < lastGrop && alloc.operation >= group
          );
          this.addAnnotation(process, task, groupOperations[group], subAllocations);

          // connect via Gateway, except the last one, if last one is single
          if (index == groups.length - 1 && materialIds.length === 1) {
            predecessor = task;
          } else {
            let gateway = this.createElement(process, Gateway.parallel);
            this.createFlow(process, gateway, task);
            predecessor = gateway;
          }

          // continue recursive call on next level
          for (let materialId of materialIds) {
            this.createSemanticProcess(
              components[materialId].residualBOM,
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
      let task = this.createTask(
        process,
        TaskNames.assemble + currentElement.materialName + quantityUnit,
        taskType
      );
      this.createFlow(process, task, predecessor);
      this.addAnnotation(process, task, operations, allocations);
      predecessor = task;

      // if subprocess requiered, stop on curent subprocess-level and create new subprocess
      if (taskType == Task.subProcess) {
        this.createSemanticProcess(residualBOM, 0, task, task);
        process.sourcedElements.push(task);
      } else {
        // create gateway if more than one component
        if (nextLayerElements.length > 1) {
          // draw gateway if needed
          let gateway = this.createElement(process, Gateway.parallel);
          this.createFlow(process, gateway, predecessor);
          predecessor = gateway;
        }

        // create each component
        nextLayerElements.push(residualBOM.length);
        for (let i = 0; i < nextLayerElements.length - 1; i++) {
          let subTree = residualBOM.slice(nextLayerElements[i], nextLayerElements[i + 1]);

          // continue recursive call on next level
          this.createSemanticProcess(subTree, iteration + 1, predecessor, process);
        }
      }
    }

    // at the end of each (sub-)process creation: merge all flows into Gateway / start Event
    if (iteration === 1) {
      let startEvent = this.createElement(process, Event.start);

      if (process.sourcedElements.length > 1) {
        let startGateway = this.createElement(process, Gateway.parallel);
        this.createFlow(process, startEvent, startGateway);
        process.sourcedElements.forEach((task) => {
          this.createFlow(process, startGateway, task);
        });
      } else {
        this.createFlow(process, startEvent, process.sourcedElements[0]);
      }
    }
  }

  // helper for semantic derivation
  createElement(process, elementType, parameter) {
    let elementId = elementType + '_' + this.randomID();

    let element = this.model.create('bpmn:' + elementType, {
      id: elementId,
      ...parameter,
    });
    process.get('flowElements').push(element);

    return element;
  }

  randomID() {
    return Math.random().toString(36).substr(2, 7);
  }

  createFlow(process, startElement, endElement, type = Other.sequenceFlow) {
    let parameter = {
      sourceRef: startElement,
      targetRef: endElement,
    };
    this.createElement(process, type, parameter);
  }

  createTask(process, name, type, parameter) {
    return this.createElement(process, type, { name: name, ...parameter });
  }

  addAnnotation(process, task, operations, allocations, skipsWorkteps) {
    if (this.processSettings.textAnnotationsContents.length === 0) return;

    let text = '';
    if (
      this.processSettings.textAnnotationsContents.includes('Duration') &&
      operations !== undefined
    ) {
      text += 'Expected DURATION: \r';
      let units = [...new Set(operations.map((op) => op.unit))];
      for (let unit of units) {
        let sum = operations.map((op) => op.quantity).reduce((a, b) => a + b);
        text += sum + ' [' + unit + '] ';
      }
      text += '\r\r';
    }
    if (
      this.processSettings.textAnnotationsContents.includes('Workplace') &&
      operations !== undefined
    ) {
      let workplaces = [...new Set(operations.map((op) => op.workCenter))];
      text += 'Required WORKPLACES: \r' + workplaces.join(', ');
      text += '\r\r';
    }
    if (
      this.processSettings.textAnnotationsContents.includes('Material') &&
      allocations !== undefined
    ) {
      text += 'Required MATERIALS: \r';
      allocations.forEach((alloc) => {
        text += alloc.component + ' (x' + alloc.quantity + '), ';
      });
      text += '\r\r';
    }
    if (
      this.processSettings.textAnnotationsContents.includes('Worksteps') &&
      operations !== undefined &&
      !skipsWorkteps
    ) {
      text += 'Required OPERATIONS: \r';
      let cols = ['operation', 'workCenter', 'quantity', 'unit', 'description'];
      for (let op of operations) {
        for (let col of cols) {
          text += op[col] + ' ';
        }
        text += '\r';
      }
    }

    // stop if no data added
    if (text.length == 0) return;

    let annotaion = this.createElement(process, Other.textAnnotation, { text: text });
    this.createFlow(process, task, annotaion, Other.association);
  }

  /**
   * Function, which derives the graphical representation of the process.
   * For a large part of the derivation a recursive function is invoked.
   * CAN BE CALLED WITHOUT PARAMETER, starts from base processs automatically
   *
   * @param {ModdelElement} process - LReference current (sub-)process
   * @returns {} Manipulation of the process-model
   */
  createGraphicProcess(process = this.process) {
    // create plane for (sub-)process
    process.plane = this.createProcessPlane(process);

    // build opening Gateway & Start
    let flowElements = process.get(NodeTypes.flowElements);
    process.startEvent = flowElements.find((element) => element.id.includes('StartEvent_'));
    let startGateway = this.getSuccessors(process.startEvent, process)[0];
    let yCenterLine = 0;

    // distinguish linear and parallel processes
    if (startGateway.id.includes('Gateway_')) {
      process.plane.sourcedElements = this.getSuccessors(startGateway, process);

      yCenterLine = process.plane.sourcedElements.length / 2 - 0.5;
      this.createElementShape(process.startEvent, 0, yCenterLine, process.plane);
      this.createElementShape(startGateway, 1, yCenterLine, process.plane);

      // draw all sourced tasks to let ther tasks align to them correctly (yPos fixed)
      process.plane.sourcedElements.forEach((successor, index) => {
        this.createElementShape(successor, 2, index, process.plane);
      });
    }
    // no gatway, just linear process
    else {
      process.plane.sourcedElements = [startGateway];
      this.createElementShape(process.startEvent, 1, 0, process.plane);
      this.createElementShape(startGateway, 2, 0, process.plane);
    }

    // calculate BOM depth to correctly place elements on x-axis
    let endEvent = flowElements.find((element) => element.id.includes('EndEvent_'));
    let bomDepthCalculated = this.calculatedBomDepth(process.startEvent, endEvent, process);

    //  CALL RECURSIVE RENDER FUNCTION to draw BPMN-Elements
    this.createNextProcessLevel(process, endEvent, bomDepthCalculated * 2 + 2);

    try {
      // draw process flows
      flowElements
        .filter((flowElement) => flowElement.id.includes('SequenceFlow_'))
        .forEach((flow) => this.createFlowShape(flow, process.plane));
    } catch (error) {
      console.log('ERROR rendering the SequenceFlows. There might be a Element misspositioned');
      console.log(error);
    }

    // draw annotaions & association
    flowElements
      .filter((flowElement) => flowElement.id.includes('TextAnnotation_'))
      .forEach((annotation) => {
        let association = flowElements.find((flowElement) => flowElement.targetRef === annotation);
        let task = association.sourceRef;
        let taskShape = process.plane
          .get('planeElement')
          .find((element) => element.bpmnElement === task);
        let bounds = taskShape.bounds;

        this.createElementShape(
          annotation,
          bounds.x / this.visualElementOffsetX + 3,
          bounds.y / this.visualElementOffsetY + 1,
          process.plane
        );
        this.createFlowShape(association, process.plane);
      });
  }

  // recursively draw the BPMN-Elements to the plane.
  createNextProcessLevel(process, currentElement, x) {
    let predecessors = this.getPredecessors(currentElement, process);
    let elementAlignment = this.processSettings.elementAlignment;

    // when currentElement is a Gateway, first draw predecessor-element and then align the gateway to them
    if (predecessors.length > 1) {
      // Gateway
      let yVals = [];

      // draw the predecessor-element
      predecessors.forEach((pred) => {
        yVals.push(this.createNextProcessLevel(process, pred, x));
      });

      // draw  gateway centered to the tasks and return its position, for other elements to align to them
      let yGateway = yVals[Math.floor(predecessors.length / 2)];
      switch (elementAlignment) {
        case 'TOP':
          yGateway = yVals[0];
          break;
        case 'DOWN': // || "Waterfall"
          yGateway = yVals[yVals.length - 1];
          break;
        case 'Steps':
          yGateway = yVals.reduce((a, b) => a + b) / yVals.length;
          break;
        default:
          yGateway = yVals[Math.floor(predecessors.length / 2)];
      }
      this.createElementShape(currentElement, x - 1, yGateway, process.plane);
      return yGateway;
    }

    // when currentElement is a Activity
    else if (predecessors.length === 1) {
      // on subprocess, render subprocess also as seperate diagram
      if (currentElement.id.includes('SubProcess_')) this.createGraphicProcess(currentElement);

      // on end of dependency chain, return yPos of sourced task, for other elements to align to them
      if (process.plane.sourcedElements.includes(currentElement)) {
        return process.plane
          .get('planeElement')
          .find((element) => element.id.includes(currentElement.id)).yPos;
      }
      // draw current Activity and return its position, for other elements to align to them
      x -= 2;
      let y = this.createNextProcessLevel(process, predecessors[0], x);
      this.createElementShape(currentElement, x, y, process.plane);
      return y;
    }
  }

  // draw a BPMN-Elements to a specified position on a plane.
  createElementShape(element, xPos, yPos, processPlane, parameter) {
    let size = this.getElementSize(element);
    let x = xPos * this.visualElementOffsetX - size.width / 2;
    let y = yPos * this.visualElementOffsetY + this.visualElementOffsetY / 2 - size.height / 2;

    let shape = this.model.create('bpmndi:BPMNShape', {
      id: element.id + '_di',
      bpmnElement: element,
      bounds: this.model.create('dc:Bounds', { x: x, y: y, ...size }),
      ...parameter,
    });
    shape.yPos = yPos;

    processPlane.get('planeElement').push(shape);
    return shape;
  }

  // draw a sequenceFlow of an element on a plane. The flow is placed, based on the position of the BPMN-Elements it connects
  createFlowShape(flowElement, processPlane) {
    let planeElements = processPlane.get('planeElement');

    let from = flowElement.sourceRef;
    let to = flowElement.targetRef;

    let fromBounds = planeElements.find((element) => element.id.includes(from.id)).bounds;
    let toBounds = planeElements.find((element) => element.id.includes(to.id)).bounds;

    let fromSize = this.getElementSize(from);
    let toSize = this.getElementSize(to);

    let yFrom = fromBounds.y + fromSize.height / 2;
    let yTo = toBounds.y + toSize.height / 2;

    let direction = yFrom > yTo ? -1 : 1;
    let waypoints;
    if (yFrom === yTo) {
      waypoints = [
        this.model.create('dc:Point', { x: fromBounds.x + fromSize.width, y: yFrom }),
        this.model.create('dc:Point', { x: toBounds.x, y: yTo }),
      ];
    } else if (from.id.includes('Gateway_') && to.id.includes('Gateway_')) {
      waypoints = [
        this.model.create('dc:Point', {
          x: fromBounds.x + fromSize.height / 2,
          y: yFrom + (direction * fromSize.height) / 2,
        }),
        this.model.create('dc:Point', { x: fromBounds.x + fromSize.width / 2, y: yTo }),
        this.model.create('dc:Point', {
          x: toBounds.x + toSize.height / 2,
          y: yTo - (direction * toSize.height) / 2,
        }),
      ];
    } else if (from.id.includes('Gateway_')) {
      waypoints = [
        this.model.create('dc:Point', {
          x: fromBounds.x + fromSize.width / 2,
          y: yFrom + (direction * fromSize.height) / 2,
        }),
        this.model.create('dc:Point', { x: fromBounds.x + fromSize.width / 2, y: yTo }),
        this.model.create('dc:Point', { x: toBounds.x, y: yTo }),
      ];
    } else if (to.id.includes('Gateway_')) {
      waypoints = [
        this.model.create('dc:Point', { x: fromBounds.x + fromSize.width, y: yFrom }),
        this.model.create('dc:Point', { x: toBounds.x + toSize.width / 2, y: yFrom }),
        this.model.create('dc:Point', {
          x: toBounds.x + toSize.width / 2,
          y: yTo - (direction * toSize.height) / 2,
        }),
      ];
    } else {
      waypoints = [
        this.model.create('dc:Point', { x: fromBounds.x + fromSize.width, y: yFrom }),
        this.model.create('dc:Point', { x: toBounds.x, y: yTo }),
      ];
    }

    let shape = this.model.create('bpmndi:BPMNEdge', {
      id: 'Edge_' + this.randomID(),
      bpmnElement: flowElement,
      waypoint: waypoints,
    });
    processPlane.get('planeElement').push(shape);
    return shape;
  }

  // return the drawing-size of an element, based on "ShapeSize"
  getElementSize(element) {
    let size = ShapeSize.default;
    Object.keys(ShapeSize).forEach((shapeName) => {
      if (element.id.includes(shapeName)) size = ShapeSize[shapeName];
    });
    return size;
  }

  // return direct successors of an element within a process
  getSuccessors(element, process) {
    return process
      .get(NodeTypes.flowElements)
      .filter((elem) => elem.sourceRef == element)
      .map((elem) => elem.targetRef);
  }

  // return direct predecessors of an element within a process
  getPredecessors(element, process) {
    return process
      .get(NodeTypes.flowElements)
      .filter((elem) => elem.targetRef == element)
      .map((elem) => elem.sourceRef);
  }

  // create a BPMN diagram and plan for the graphical representation of a (sub-)process
  createProcessPlane(process) {
    let bpmnDiagram = this.model.create('bpmndi:BPMNDiagram', {
      id: 'BPMNDiagram_' + this.planeIdCounter++, //process.id.replace(/[^a-z0-9]/gi, ''),
      name: 'BPMNDiagram_' + process.name.replace(/[^a-z0-9]/gi, ''),
    });

    let plane = this.model.create('bpmndi:BPMNPlane', {
      id: 'BPMNPlane_' + this.planeIdCounter,
      // name : "BPMNDiagram_"+ process.name.replace(/[^a-z0-9]/gi, '')
    });
    plane.bpmnElement = process;
    bpmnDiagram.set('plane', plane);

    this.definitions.get('diagrams').push(bpmnDiagram);
    return plane;
  }

  // iterate recursively through the bpmn process (from element to target) to find the path with the largest number of tasks
  calculatedBomDepth(element, target, process) {
    if (element == target) return 0;
    else {
      let successors = process
        .get(NodeTypes.flowElements)
        .filter((elem) => elem.sourceRef == element)
        .map((elem) => elem.targetRef);
      let successorTasks = successors.flatMap((suc) => {
        if (suc.id.includes('Gateway_')) {
          return process
            .get(NodeTypes.flowElements)
            .filter((elem) => elem.sourceRef == suc)
            .map((elem) => elem.targetRef);
        }
        return suc;
      });

      return (
        1 + Math.max(...successorTasks.map((suc) => this.calculatedBomDepth(suc, target, process)))
      );
    }
  }
}

// constants
const ShapeSize = {
  Task: { width: 100, height: 80 },
  SubProcess: { width: 100, height: 80 },
  Event: { width: 36, height: 36 },
  Gateway: { width: 50, height: 50 },
  TextAnnotation: { width: 400, height: 200 },
  default: { width: 70, height: 50 },
};

const TaskNames = {
  assemble: 'Assemble ',
  source: 'Source ',
  finalize: 'Finalize ',
  combineXY: 'Add X into Y ',
};

const Task = {
  none: 'Task',
  service: 'ServiceTask',
  send: 'SendTask',
  user: 'UserTask',
  manual: 'ManualTask',
  script: 'ScriptTask',
  subProcess: 'SubProcess', //? corrects
};

const Event = {
  start: 'StartEvent',
  end: 'EndEvent',
  intermediateCatch: 'IntermediateCatchEvent',
  intermediateThrow: 'IntermediateThrowEvent',
};

const Gateway = {
  exclusive: 'ExclusiveGateway',
  parallel: 'ParallelGateway',
  intermediateCatch: 'InclusiveGateway',
  complex: 'ComplexGateway',
  event: 'EventBasedGateway',
};

const Other = {
  textAnnotation: 'TextAnnotation',
  association: 'Association',
  sequenceFlow: 'SequenceFlow',
};

const NodeTypes = {
  rootElements: 'rootElements',
  flowElements: 'flowElements',
  values: 'values',
  diagrams: 'diagrams',
  imports: 'imports',
  extensionElements: 'extensionElements',
  BPMNShape: 'BPMNShape',
};

//const EventDefinition = {
//    message: 'MessageEventDefinition',
//    escalation: 'EscalationEventDefinition',
//    conditional: 'ConditionalEventDefinition',
//    link:'LinkEventDefinition',
//    compensate: 'CompensateEventDefinition',
//    signal: 'SignalEventDefinition',
//  };
//

module.exports = ProcessBuilder;
