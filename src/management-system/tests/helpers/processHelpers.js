import {
  toBpmnObject,
  toBpmnXml,
  setDefinitionsId,
  setDefinitionsName,
  setProcessId,
  setTargetNamespace,
  setStandardDefinitions,
  addDocumentation,
  getExporterName,
  getExporterVersion,
} from '@proceed/bpmn-helper';

export async function getBpmn({
  id,
  name,
  standardDefinitions,
  processId,
  processDescription,
  startEventId,
}) {
  startEventId = startEventId || 'StartEvent_1';
  let bpmn = `
  <?xml version="1.0" encoding="UTF-8"?>
  <Definitions
      xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
      xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
      xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  >
    <Process id="Process_1" name="PROCEED Main Process" processType="Private" isExecutable="true">
      <startEvent id="${startEventId}"/>
    </Process>
    <bpmndi:BPMNDiagram id="BPMNDiagram_1">
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
        <bpmndi:BPMNShape id="${startEventId}_di" bpmnElement="${startEventId}">
          <dc:Bounds height="36.0" width="36.0" x="350.0" y="200.0"/>
        </bpmndi:BPMNShape>
      </bpmndi:BPMNPlane>
    </bpmndi:BPMNDiagram>
  </Definitions>
  `;

  // make sure that that the returned value gets formatted by bpmn-moddle since it will be used in the module functions
  const bpmnObj = await toBpmnObject(bpmn);
  if (id) {
    await setDefinitionsId(bpmnObj, id);
    await setTargetNamespace(bpmnObj, id);
  }

  if (name) {
    await setDefinitionsName(bpmnObj, name);
  }

  if (standardDefinitions) {
    await setStandardDefinitions(bpmnObj, getExporterName(), getExporterVersion());
  }

  if (processId) {
    await setProcessId(bpmnObj, processId);
  }

  if (processDescription) {
    await addDocumentation(bpmnObj, processDescription);
  }

  return await toBpmnXml(bpmnObj);
}
