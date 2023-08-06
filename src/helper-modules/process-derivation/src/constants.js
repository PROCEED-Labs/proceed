const VisualElementOffsetX = 125;
const VisualElementOffsetY = 110;

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

const ExpectedColNames = {
  BOM: {
    material: ['Component number', 'MatID', 'material', 'Komponentennummer'],
    materialName: ['Object description', 'name', 'Objektkurztext', 'materialName'],
    layer: ['Layer', 'Level', 'Lvl', 'Stufe', 'layer'],
    materialType: ['Material type', 'type', 'Positionstyp', 'materialType'], // ROH HALB FERT
    quantity: ['Comp. Qty (CUn)', 'quantity', 'Komponentenmenge', 'quantity'],
    unit: ['Component UoM', 'unit', 'KompMengenEinheit', 'unit'],
    // category: ["Item category", "category", "Warengruppe"],  // L / T
  },

  operations: {
    operation: ['Operation', 'operation'],
    workCenter: ['WorkCenter', 'workCenter'],
    description: ['Description', 'description'],
    quantity: ['Quantity', 'quantity'],
    unit: ['Unit', 'unit'],
  },

  allocations: {
    operation: ['Operation', 'operation'],
    component: ['Component', 'component'],
    quantity: ['Quantity', 'quantity'],
    unit: ['Unit', 'unit'],
    // itemNr:["ItemNr"],
    // itemCategory:["ItemCategory"],
    // materialDescription:["MaterialDescription"],
  },
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

module.exports = {
  VisualElementOffsetX,
  VisualElementOffsetY,
  ShapeSize,
  TaskNames,
  Task,
  Event,
  Gateway,
  Other,
  NodeTypes,
  ExpectedColNames,
};
