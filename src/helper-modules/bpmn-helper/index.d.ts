declare const _exports: {
    ensureExtensionElements(element: object): object;
    removeEmptyExtensionElements(element: any): void;
    ensureContainerElement(element: object, containerType: string): object;
    removeEmptyContainerElement(element: any, containerType: any, containerElement: any): void;
    setMetaData(bpmn: string | object, elId: string, metaValues: object): Promise<string | object>;
    setProceedElement(element: any, proceedElementType: any, value: any, attributes?: {}, oldAttributes?: {}): {};
    getExporterName(): string;
    getExporterVersion(): string;
    generateBpmnId(prefix?: string): string;
    generateDefinitionsId(): string;
    generateProcessId(): string;
    generateUserTaskFileName(): string;
    generateScriptTaskFileName(): string;
    getUserTaskImplementationString(): string;
    generateTargetNamespace(id: any): string;
    initXml(processId?: any, startEventId?: string): string;
    validateCalledProcess(xml: string, processId: string): Promise<boolean>;
    setDefinitionsId(bpmn: string | object, id: string): Promise<string | object>;
    setDefinitionsName(bpmn: string | object, name: string): Promise<string | object>;
    setDefinitionsVersionInformation(bpmn: string | object, { versionId, versionName, versionDescription, versionBasedOn, versionCreatedOn, }: {
        versionId?: string;
        versionName?: string;
        versionDescription?: string;
        versionBasedOn?: string;
        versionCreatedOn?: string;
    }): Promise<string | object>;
    setProcessId(bpmn: string, id: string): Promise<string | object>;
    setTemplateId(bpmn: string, id: string): Promise<string | object>;
    setTargetNamespace(bpmn: string | object, id: string): Promise<string | object>;
    setStandardDefinitions(bpmn: string | object, exporterName: string, exporterVersion: string): Promise<string | object>;
    setDeploymentMethod(bpmn: string | object, method: string): Promise<string | object>;
    setMachineInfo(bpmn: string | object, machineInfo: {
        [elementId: string]: {
            machineAddress?: string;
            machineId?: string;
        };
    }): Promise<string | object>;
    setUserTaskData(bpmn: string | object, userTaskId: string, newFileName: string, newImplementation?: string): Promise<string | object>;
    addConstraintsToElementById(bpmn: string | object, elementId: string, constraints: object): Promise<string | object>;
    addCallActivityReference(bpmn: string | object, callActivityId: string, calledBpmn: string, calledProcessLocation: string): Promise<string | object>;
    removeCallActivityReference(bpmn: string | object, callActivityId: string): Promise<string | object>;
    removeUnusedCallActivityReferences(bpmn: string | object): Promise<string | object>;
    removeColorFromAllElements(bpmn: string | object): Promise<string | object>;
    addDocumentation(bpmn: string | object, description?: string): Promise<string | object>;
    addDocumentationToProcessObject(processObj: object, description?: string): void;
    updatePerformersOnElement(element: object, performers: any[]): Promise<void>;
    updatePerformersOnElementById(bpmn: string | object, elementId: string, performers: any[]): Promise<any>;
    getDefinitionsId(bpmn: string | object): Promise<string>;
    getOriginalDefinitionsId(bpmn: string | object): Promise<string>;
    getDefinitionsName(bpmn: string | object): Promise<string>;
    getDefinitionsInfos(bpmn: string | object): Promise<getters.DefinitionsInfos>;
    getImports(bpmn: string | object): Promise<object[]>;
    getDefinitionsVersionInformation(bpmn: string | object): Promise<{
        versionId?: string;
        name?: string;
        description?: string;
        versionBasedOn?: string;
        versionCreatedOn: string;
    }>;
    getProcessIds(bpmn: string | object): Promise<string[]>;
    getDeploymentMethod(bpmn: string | object): Promise<string>;
    getProcessConstraints(bpmn: string | object): Promise<{
        hardConstraints: any[];
        softConstraints: any[];
    }>;
    getProcessDocumentation(bpmn: string | object): Promise<string>;
    getProcessDocumentationByObject(processObject: object): string;
    getUserTaskFileNameMapping(bpmn: string | object): Promise<{
        [userTaskId: string]: {
            fileName?: string;
            implementation?: string;
        };
    }>;
    getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn: string | object): Promise<{
        [userTaskFileName: string]: string[];
    }>;
    getSubprocess(bpmn: string | object, subprocessId: string): Promise<string>;
    getSubprocessContent(bpmn: string, subprocessId: string): Promise<string>;
    getTargetDefinitionsAndProcessIdForCallActivityByObject(bpmnObj: object, callActivityId: string): {
        definitionId: string;
        processId: string;
        versionId: string;
    };
    getDefinitionsAndProcessIdForEveryCallActivity(bpmn: string | object, dontThrow?: boolean): Promise<{
        [callActivityId: string]: {
            definitionId: string;
            processId: string;
            versionId: string;
        };
    }>;
    getStartEvents(bpmn: string | object): Promise<string[]>;
    getAllBpmnFlowElements(bpmn: string | object): Promise<object[]>;
    getAllBpmnFlowNodeIds(bpmn: string | object): Promise<string[]>;
    getAllBpmnFlowElementIds(bpmn: string | object): Promise<string[]>;
    getChildrenFlowElements(bpmn: string | object, elementId: any): Promise<object[]>;
    getElementMachineMapping(bpmn: string | object): Promise<{
        [flowNodeId: string]: {
            machineAddress?: string;
            machineId?: string;
        };
    }>;
    getTaskConstraintMapping(bpmn: string | object): Promise<{
        [bpmnElementIds: string]: {
            hardConstraints: any[];
            softConstraints: any[];
        };
    }>;
    getIdentifyingInfos(bpmn: string | object): Promise<{
        id: string;
        originalId?: string;
        processIds: string[];
        name: string;
        description: string;
    }>;
    getRootFromElement(businessObject: object): object;
    getMetaDataFromElement(element: object): {
        [key: string]: any;
    };
    getMetaData(bpmn: string | object, elId: string): Promise<{
        [key: string]: any;
    }>;
    getMilestonesFromElement(element: object): {
        id: string;
        name: string;
        description?: string;
    }[];
    getMilestonesFromElementById(bpmn: string | object, elementId: string): {
        id: string;
        name: string;
        description?: string;
    }[];
    getResourcesFromElement(element: object): {
        consumableMaterial: getters.ResourceInfos[];
        tool: getters.ResourceInfos[];
        inspectionInstrument: getters.ResourceInfos[];
    };
    getLocationsFromElement(element: object): {
        company: getters.CompanyInfos[];
        factory: getters.FactoryInfos[];
        building: getters.BuildingInfos[];
        area: getters.AreaInfos[];
        workingPlace: getters.WorkingPlaceInfos[];
    };
    getPerformersFromElement(element: object): any[];
    getPerformersFromElementById(bpmn: string | object, elementId: string): any[];
    parseISODuration(isoDuration: string): {
        years: number;
        months: number;
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    };
    convertISODurationToMiliseconds(isoDuration: string): number;
    ensureCorrectProceedNamespace(xml: string): string;
    toBpmnObject(xml: string, typename?: string): Promise<object>;
    toBpmnXml(obj: any): Promise<string>;
    deepCopyElementById(bpmn: string | object, elemId: any): Promise<object>;
    getChildren(travObj: object): any[];
    getElementsByTagName(travObj: object, tagname: string): any[];
    getAllElements(travObj: object): any[];
    getElementById(travObj: object, id: string): object;
    getElementDI(element: object, definitions?: object): any;
    manipulateElementById(bpmn: string | object, id: string, manipFunc: util.manipulationFunction): Promise<string | object>;
    manipulateElementsByTagName(bpmn: string | object, tagName: string, manipFunc: util.manipulationFunction): Promise<string | object>;
    moddle: any;
};
export = _exports;
import getters = require("./src/getters.js");
import util = require("./src/util.js");
