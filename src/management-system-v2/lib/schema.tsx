export const schema = {
  name: 'DistributedBPMNProcesses',
  uri: 'https://docs.proceed-labs.org/BPMN',
  prefix: 'proceed',
  types: [
    {
      name: 'timePlannedDuration',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'timePlannedOccurrence',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'timePlannedEnd',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'costsPlanned',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'Number',
        },
        {
          name: 'unit',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'occurrenceProbability',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'number',
        },
      ],
    },
    {
      name: 'orderNumber',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'orderName',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'orderCode',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'customerId',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'customerName',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'property',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
        {
          name: 'name',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'overviewImage',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'defaultPriority',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'Number',
        },
      ],
    },
    {
      name: 'mqttServer',
      properties: [
        {
          name: 'url',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'topic',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'user',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'password',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'Meta',
      superClass: ['Element'],
      properties: [
        {
          name: 'values',
          type: 'Element',
          isMany: true,
        },
        {
          name: 'costsPlanned',
          isMany: false,
          type: 'costsPlanned',
        },
        {
          name: 'timePlannedDuration',
          isMany: false,
          type: 'timePlannedDuration',
        },
        {
          name: 'timePlannedOccurrence',
          isMany: false,
          type: 'timePlannedOccurrence',
        },
        {
          name: 'timePlannedEnd',
          isMany: false,
          type: 'timePlannedEnd',
        },
        {
          name: 'occurrenceProbability',
          isMany: false,
          type: 'occurrenceProbability',
        },
        {
          name: 'orderNumber',
          isMany: false,
          type: 'orderNumber',
        },
        {
          name: 'orderName',
          isMany: false,
          type: 'orderName',
        },
        {
          name: 'orderCode',
          isMany: false,
          type: 'orderCode',
        },
        {
          name: 'customerId',
          isMany: false,
          type: 'customerId',
        },
        {
          name: 'customerName',
          isMany: false,
          type: 'customerName',
        },
        {
          name: 'property',
          isMany: true,
          type: 'property',
        },
        {
          name: 'overviewImage',
          isMany: false,
          type: 'overviewImage',
        },
        {
          name: 'defaultPriority',
          isMany: false,
          type: 'defaultPriority',
        },
        {
          name: 'mqttServer',
          isMany: false,
          type: 'mqttServer',
        },
      ],
    },
    {
      name: 'version',
      extends: ['bpmn:Definitions', 'bpmn:Import'],
      properties: [
        {
          name: 'version',
          isAttr: true,
          type: 'Number',
        },
      ],
    },
    {
      name: 'versionName',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'versionName',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'versionDescription',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'versionDescription',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'versionBasedOn',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'versionBasedOn',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'creatorEnvironmentId',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'creatorEnvironmentId',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'creatorEnvironmentName',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'creatorEnvironmentName',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'templateId',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'templateId',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'originalId',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'originalId',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'originalExporter',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'originalExporter',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'originalExporterVersion',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'originalExporterVersion',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'originalTargetNamespace',
      extends: ['bpmn:Definitions'],
      properties: [
        {
          name: 'originalTargetNamespace',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'deploymentMethod',
      extends: ['bpmn:Process'],
      properties: [
        {
          name: 'deploymentMethod',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'machineId',
      extends: ['bpmn:FlowNode'],
      properties: [
        {
          name: 'machineId',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'machineAddress',
      extends: ['bpmn:FlowNode'],
      properties: [
        {
          name: 'machineAddress',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'fileName',
      extends: ['bpmn:FlowNode'],
      properties: [
        {
          name: 'fileName',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'LinkProcessNode',
      extends: ['bpmn:FlowNode'],
      properties: [
        {
          name: 'sourceProcess',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'targetProcess',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'sourceMachine',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'targetMachine',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'parentProcess',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'external',
      extends: ['bpmn:Task'],
      properties: [
        {
          name: 'external',
          isAttr: true,
          type: 'Boolean',
        },
      ],
    },
    {
      name: 'placeholder',
      extends: ['bpmn:Task'],
      properties: [
        {
          name: 'placeholder',
          isAttr: true,
          type: 'Boolean',
        },
      ],
    },
    {
      name: 'manualInterruptionHandling',
      extends: ['bpmn:FlowElement'],
      properties: [
        {
          name: 'manualInterruptionHandling',
          isAttr: true,
          type: 'Boolean',
        },
      ],
    },
    {
      name: 'Script',
      superClass: ['InputOutputParameterDefinition'],
      properties: [
        {
          name: 'scriptFormat',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'resource',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'ProcessConstraints',
      superClass: ['Element'],
      properties: [
        {
          name: 'hardConstraints',
          isMany: false,
          type: 'HardConstraints',
        },
        {
          name: 'softConstraints',
          isMany: false,
          type: 'SoftConstraints',
        },
      ],
    },
    {
      name: 'HardConstraints',
      properties: [
        {
          name: 'hardConstraint',
          isMany: true,
          type: 'HardConstraint',
        },
        {
          name: 'constraintGroup',
          isMany: true,
          type: 'ConstraintGroup',
        },
      ],
    },
    {
      name: 'SoftConstraints',
      properties: [
        {
          name: 'softConstraint',
          isMany: true,
          type: 'SoftConstraint',
        },
      ],
    },
    {
      name: 'roles',
      properties: [
        {
          name: 'role',
          isMany: true,
          type: 'role',
        },
      ],
    },
    {
      name: 'role',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'users',
      properties: [
        {
          name: 'user',
          isMany: true,
          type: 'user',
        },
      ],
    },
    {
      name: 'user',
      properties: [
        {
          name: 'name',
          isBody: false,
          type: 'name',
        },
        {
          name: 'id',
          isBody: false,
          type: 'id',
        },
        {
          name: 'password',
          isBody: false,
          type: 'password',
        },
        {
          name: 'clientsecret',
          isBody: false,
          type: 'clientsecret',
        },
        {
          name: 'clientid',
          isBody: false,
          type: 'clientid',
        },
        {
          name: 'provider',
          isBody: false,
          type: 'provider',
        },
        {
          name: 'origin',
          isBody: false,
          type: 'origin',
        },
      ],
    },
    {
      name: 'HardConstraint',
      properties: [
        {
          name: 'name',
          isMany: false,
          type: 'Name',
        },
        {
          name: 'condition',
          type: 'String',
        },
        {
          name: 'values',
          isMany: false,
          type: 'Values',
        },
        {
          name: 'hardConstraints',
          isMany: false,
          type: 'HardConstraints',
        },
      ],
    },
    {
      name: 'ConstraintGroup',
      properties: [
        {
          name: 'hardConstraint',
          isMany: true,
          type: 'HardConstraint',
        },
        {
          name: 'constraintGroupRef',
          isMany: true,
          type: 'ConstraintGroupRef',
        },
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'name',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'conjunction',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'ConstraintGroupRef',
      properties: [
        {
          name: 'ref',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'Values',
      properties: [
        {
          name: 'value',
          isMany: true,
          type: 'Value',
        },
        {
          name: 'conjunction',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'Value',
      properties: [
        {
          name: 'name',
          isBody: true,
          type: 'String',
        },
        {
          name: 'unit',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'Name',
      properties: [
        {
          name: 'name',
          isBody: true,
          type: 'String',
        },
        {
          name: 'externalRequestArgument',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'SoftConstraint',
      properties: [
        {
          name: 'name',
          isMany: false,
          type: 'Name',
        },
        {
          name: 'condition',
          type: 'String',
        },
        {
          name: 'weight',
          isAttr: true,
          type: 'number',
        },
        {
          name: 'timeout',
          isAttr: true,
          type: 'number',
        },
      ],
    },
    {
      name: 'capabilities',
      superClass: ['Element'],
      properties: [
        {
          name: 'capability',
          isMany: true,
          type: 'capability',
        },
      ],
    },
    {
      name: 'capability',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'Resources',
      superClass: ['Element'],
      properties: [
        {
          name: 'consumableMaterial',
          isMany: true,
          type: 'ConsumableMaterial',
        },
        {
          name: 'tool',
          isMany: true,
          type: 'Tool',
        },
        {
          name: 'inspectionInstrument',
          isMany: true,
          type: 'InspectionInstrument',
        },
      ],
    },
    {
      name: 'ConsumableMaterial',
      properties: [
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'shortName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'longName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'manufacturer',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'manufacturerSerialNumber',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'unit',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'quantity',
          isAttr: true,
          type: 'number',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'Tool',
      properties: [
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'shortName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'longName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'manufacturer',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'manufacturerSerialNumber',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'unit',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'quantity',
          isAttr: true,
          type: 'number',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'InspectionInstrument',
      properties: [
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'shortName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'longName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'manufacturer',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'manufacturerSerialNumber',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'unit',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'quantity',
          isAttr: true,
          type: 'number',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'Locations',
      superClass: ['Element'],
      properties: [
        {
          name: 'company',
          isMany: true,
          type: 'Company',
        },
        {
          name: 'factory',
          isMany: true,
          type: 'Factory',
        },
        {
          name: 'building',
          isMany: true,
          type: 'Building',
        },
        {
          name: 'area',
          isMany: true,
          type: 'Area',
        },
        {
          name: 'workingPlace',
          isMany: true,
          type: 'WorkingPlace',
        },
      ],
    },
    {
      name: 'Company',
      properties: [
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'shortName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'longName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'Factory',
      properties: [
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'shortName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'longName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'companyRef',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'Building',
      properties: [
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'shortName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'longName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'factoryRef',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'Area',
      properties: [
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'shortName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'longName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'buildingRef',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'WorkingPlace',
      properties: [
        {
          name: 'id',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'shortName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'longName',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'buildingRef',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'areaRef',
          isAttr: true,
          type: 'String',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'Milestones',
      superClass: ['Element'],
      properties: [
        {
          name: 'milestone',
          isMany: true,
          type: 'Milestone',
        },
      ],
    },
    {
      name: 'Milestone',
      properties: [
        {
          name: 'id',
          isMany: false,
          type: 'String',
        },
        {
          name: 'name',
          isMany: false,
          type: 'String',
        },
        {
          name: 'description',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'id',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'password',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'clientsecret',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'clientid',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'provider',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'origin',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
      ],
    },
  ],
  xml: {
    tagAlias: 'lowerCase',
  },
  emumerations: [],
  associations: [],
};

export default schema;
