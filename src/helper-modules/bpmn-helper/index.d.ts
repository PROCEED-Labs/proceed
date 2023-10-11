declare const _exports: {
  ensureExtensionElements(element: object): object;
  removeEmptyExtensionElements(element: any): void;
  ensureContainerElement(element: object, containerType: string): object;
  removeEmptyContainerElement(element: any, containerType: any, containerElement: any): void;
  setMetaData(bpmn: string | object, elId: string, metaValues: object): Promise<string | object>;
  setProceedElement(element: any, proceedElementType: any, value: any, attributes?: {}): {};
  getExporterName(): string;
  getExporterVersion(): string;
  generateBpmnId(prefix?: string): string;
  generateDefinitionsId(): string;
  generateProcessId(): string;
  generateUserTaskFileName(): string;
  getUserTaskImplementationString(): string;
  generateTargetNamespace(id: any): string;
  initXml(processId?: any, startEventId?: string): string;
  validateCalledProcess(xml: string, processId: string): Promise<boolean>;
  setDefinitionsId(bpmn: string | object, id: string): Promise<string | object>;
  setDefinitionsName(bpmn: string | object, name: string): Promise<string | object>;
  setDefinitionsVersionInformation(
    bpmn: string | object,
    {
      version,
      versionName,
      versionDescription,
      versionBasedOn,
    }: {
      version?: string | number;
      versionName?: string;
      versionDescription?: string;
      versionBasedOn?: string | number;
    },
  ): Promise<string | object>;
  setProcessId(bpmn: string, id: string): Promise<string | object>;
  setTemplateId(bpmn: string, id: string): Promise<string | object>;
  setTargetNamespace(bpmn: string | object, id: string): Promise<string | object>;
  setStandardDefinitions(
    bpmn: string | object,
    exporterName: string,
    exporterVersion: string,
  ): Promise<string | object>;
  setDeploymentMethod(bpmn: string | object, method: string): Promise<string | object>;
  setMachineInfo(
    bpmn: string | object,
    machineInfo: {
      [elementId: string]: {
        machineAddress?: string;
        machineId?: string;
      };
    },
  ): Promise<string | object>;
  setUserTaskData(
    bpmn: string | object,
    userTaskId: string,
    newFileName: string,
    newImplementation?: string,
  ): Promise<string | object>;
  addConstraintsToElementById(
    bpmn: string | object,
    elementId: string,
    constraints: object,
  ): Promise<string | object>;
  addCallActivityReference(
    bpmn: string | object,
    callActivityId: string,
    calledBpmn: string,
    calledProcessLocation: string,
  ): Promise<string | object>;
  removeCallActivityReference(
    bpmn: string | object,
    callActivityId: string,
  ): Promise<string | object>;
  removeUnusedCallActivityReferences(bpmn: string | object): Promise<string | object>;
  removeColorFromAllElements(bpmn: string | object): Promise<string | object>;
  addDocumentation(bpmn: string | object, description: string): Promise<string | object>;
  addDocumentationToProcessObject(processObj: object, description: string): void;
  updatePerformersOnElement(element: object, performers: any[]): Promise<void>;
  updatePerformersOnElementById(
    bpmn: string | object,
    elementId: string,
    performers: any[],
  ): Promise<any>;
  getDefinitionsId: typeof getters.getDefinitionsId;
  getOriginalDefinitionsId: typeof getters.getOriginalDefinitionsId;
  getDefinitionsName: typeof getters.getDefinitionsName;
  getDefinitionsInfos: typeof getters.getDefinitionsInfos;
  getImports: typeof getters.getImports;
  getDefinitionsVersionInformation: typeof getters.getDefinitionsVersionInformation;
  getProcessIds: typeof getters.getProcessIds;
  getDeploymentMethod: typeof getters.getDeploymentMethod;
  getProcessConstraints: typeof getters.getProcessConstraints;
  getProcessDocumentation: typeof getters.getProcessDocumentation;
  getProcessDocumentationByObject: typeof getters.getProcessDocumentationByObject;
  getUserTaskFileNameMapping: typeof getters.getUserTaskFileNameMapping;
  getAllUserTaskFileNamesAndUserTaskIdsMapping: typeof getters.getAllUserTaskFileNamesAndUserTaskIdsMapping;
  getSubprocess: typeof getters.getSubprocess;
  getSubprocessContent: typeof getters.getSubprocessContent;
  getTargetDefinitionsAndProcessIdForCallActivityByObject: typeof getters.getTargetDefinitionsAndProcessIdForCallActivityByObject;
  getDefinitionsAndProcessIdForEveryCallActivity: typeof getters.getDefinitionsAndProcessIdForEveryCallActivity;
  getStartEvents: typeof getters.getStartEvents;
  getAllBpmnFlowElements: typeof getters.getAllBpmnFlowElements;
  getAllBpmnFlowNodeIds: typeof getters.getAllBpmnFlowNodeIds;
  getAllBpmnFlowElementIds: typeof getters.getAllBpmnFlowElementIds;
  getChildrenFlowElements: typeof getters.getChildrenFlowElements;
  getElementMachineMapping: typeof getters.getElementMachineMapping;
  getTaskConstraintMapping: typeof getters.getTaskConstraintMapping;
  getIdentifyingInfos: typeof getters.getIdentifyingInfos;
  getRootFromElement: typeof getters.getRootFromElement;
  getMetaDataFromElement: typeof getters.getMetaDataFromElement;
  getMetaData: typeof getters.getMetaData;
  getMilestonesFromElement: typeof getters.getMilestonesFromElement;
  getMilestonesFromElementById: typeof getters.getMilestonesFromElementById;
  getResourcesFromElement: typeof getters.getResourcesFromElement;
  getLocationsFromElement: typeof getters.getLocationsFromElement;
  getPerformersFromElement: typeof getters.getPerformersFromElement;
  getPerformersFromElementById: typeof getters.getPerformersFromElementById;
  parseISODuration: typeof getters.parseISODuration;
  convertISODurationToMiliseconds: typeof getters.convertISODurationToMiliseconds;
  ensureCorrectProceedNamespace(xml: string): string;
  toBpmnObject(xml: string, typename?: string): Promise<object>;
  toBpmnXml(obj: any): Promise<string>;
  getChildren(travObj: object): any[];
  getElementsByTagName(travObj: object, tagname: string): any[];
  getAllElements(travObj: object): any[];
  getElementById(travObj: object, id: string): object;
  getElementDI(element: object, definitions?: object): any;
  manipulateElementById(
    bpmn: string | object,
    id: string,
    manipFunc: util.manipulationFunction,
  ): Promise<string | object>;
  manipulateElementsByTagName(
    bpmn: string | object,
    tagName: string,
    manipFunc: util.manipulationFunction,
  ): Promise<string | object>;
  moddle: any;
};
export = _exports;
import getters = require('./src/getters.js');
import util = require('./src/util.js');
