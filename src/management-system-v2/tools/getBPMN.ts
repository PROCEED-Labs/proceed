import { z } from 'zod';
import { type InferSchema } from 'xmcp';

// Define the schema for tool parameters
export const schema = {
  processId: z.string().describe('The ID of the process'),
};

// Define tool metadata
export const metadata = {
  name: 'get-bpmn',
  description: 'Get the BPMN representation of a process',
  annotations: {
    title: 'Get BPMN',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getBPMN({ processId }: InferSchema<typeof schema>) {
  const result = `BPMN representation for process ${processId}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:proceed="https://docs.proceed-labs.org/BPMN" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsd="http://www.w3.org/2001/XMLSchema" id="_6a43adb8-fff1-4f5d-bbbe-be4d63e18552" name="Vacation S1 - Manual" targetNamespace="https://docs.proceed-labs.org/_6a43adb8-fff1-4f5d-bbbe-be4d63e18552" expressionLanguage="https://ecma-international.org/ecma-262/8.0/" typeLanguage="https://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf" exporter="PROCEED Management System" exporterVersion="1.0.0" proceed:processVersionId="" proceed:processVersionName="" proceed:creatorSpaceId="00000000-0000-0000-0000-000000000000" proceed:creatorSpaceName="" proceed:creatorId="00000000-0000-0000-0000-000000000000" proceed:creatorName="Admin Admin" proceed:creatorUsername="admin" proceed:creationDate="2026-01-08T20:35:03.200Z" proceed:userDefinedId="Vac-S1-M" xsi:schemaLocation="https://docs.proceed-labs.org/BPMN https://docs.proceed-labs.org/xsd/XSD-PROCEED.xsd http://www.omg.org/spec/BPMN/20100524/MODEL https://www.omg.org/spec/BPMN/20100501/BPMN20.xsd">
  <process id="Process_0sxt756" name="PROCEED Main Process" processType="Private" isExecutable="true" proceed:uiForNontypedStartEventsFileName="Process_Start_0e3fu61">
    <documentation>Manual application for vacation</documentation>
    <extensionElements>
      <proceed:variables>
        <proceed:variable name="start-date" dataType="string" description="Desired start date of the vacation" requiredAtInstanceStartup="true" />
        <proceed:variable name="end-date" dataType="string" description="Desired end date of the vacation" requiredAtInstanceStartup="true" />
      </proceed:variables>
    </extensionElements>
    <startEvent id="StartEvent_1swtiwh">
      <outgoing>Flow_14hdjth</outgoing>
    </startEvent>
    <sequenceFlow id="Flow_14hdjth" sourceRef="StartEvent_1swtiwh" targetRef="Gateway_0utfhz5" />
    <task id="Activity_0t5waym" name="Check vacation application">
      <documentation>* check remaining days of employee
* check day if they don't contradict company regulations
* check new remaining days</documentation>
      <incoming>Flow_0a8zc4r</incoming>
      <outgoing>Flow_1feef5e</outgoing>
    </task>
    <sequenceFlow id="Flow_0a8zc4r" sourceRef="Activity_1k5qsys" targetRef="Activity_0t5waym" />
    <exclusiveGateway id="Gateway_1vh1m1a">
      <incoming>Flow_1feef5e</incoming>
      <outgoing>Flow_1ut4qzf</outgoing>
      <outgoing>Flow_10s6so5</outgoing>
    </exclusiveGateway>
    <sequenceFlow id="Flow_1feef5e" sourceRef="Activity_0t5waym" targetRef="Gateway_1vh1m1a" />
    <exclusiveGateway id="Gateway_0utfhz5">
      <incoming>Flow_14hdjth</incoming>
      <incoming>Flow_1ut4qzf</incoming>
      <outgoing>Flow_14f8dwg</outgoing>
    </exclusiveGateway>
    <sequenceFlow id="Flow_14f8dwg" sourceRef="Gateway_0utfhz5" targetRef="Activity_1k5qsys" />
    <sequenceFlow id="Flow_1ut4qzf" name="Mistakes in Application Sheet" sourceRef="Gateway_1vh1m1a" targetRef="Gateway_0utfhz5" />
    <task id="Activity_0xfxwn7" name="Manager checks application and signs">
      <incoming>Flow_10s6so5</incoming>
      <outgoing>Flow_11u9zmw</outgoing>
    </task>
    <sequenceFlow id="Flow_10s6so5" name="Everything is&#10; okay" sourceRef="Gateway_1vh1m1a" targetRef="Activity_0xfxwn7" />
    <task id="Activity_1k5qsys" name="Fill vacation sheet, sign it and send form to Back Office" proceed:fileName="User_Task_1egdfro">
      <documentation>* get a vacation sheet
* get your remaining vacation days
* insert your vacation dates
* calculate the new remaining vacation days
* sign it
* send sheet to back office</documentation>
      <incoming>Flow_14f8dwg</incoming>
      <outgoing>Flow_0a8zc4r</outgoing>
    </task>
    <endEvent id="Event_1m0d1gp" name="Send result via Mail">
      <incoming>Flow_11u9zmw</incoming>
      <messageEventDefinition id="MessageEventDefinition_0v5im59" />
    </endEvent>
    <sequenceFlow id="Flow_11u9zmw" sourceRef="Activity_0xfxwn7" targetRef="Event_1m0d1gp" />
    <proceed:genericResource id="GenericResource_0sinjjd" name="Employee" resourceType="User" />
    <proceed:genericResource id="GenericResource_1ddvuww" name="Back Office" resourceType="User" />
    <association id="Association_00vv2y6" associationDirection="None" sourceRef="Activity_0t5waym" targetRef="GenericResource_1ddvuww" />
    <proceed:genericResource id="GenericResource_15nlxuu" name="Employee&#39;s Manager" resourceType="User" />
    <association id="Association_0xorop6" associationDirection="None" sourceRef="Activity_0xfxwn7" targetRef="GenericResource_15nlxuu" />
    <association id="Association_0p6ui4a" associationDirection="None" sourceRef="Activity_1k5qsys" targetRef="GenericResource_0sinjjd" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_0sxt756">
      <bpmndi:BPMNShape id="StartEvent_1swtiwh_di" bpmnElement="StartEvent_1swtiwh">
        <dc:Bounds x="282" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0t5waym_di" bpmnElement="Activity_0t5waym">
        <dc:Bounds x="600" y="178" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1vh1m1a_di" bpmnElement="Gateway_1vh1m1a" isMarkerVisible="true">
        <dc:Bounds x="765" y="193" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_0utfhz5_di" bpmnElement="Gateway_0utfhz5" isMarkerVisible="true">
        <dc:Bounds x="345" y="193" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0xfxwn7_di" bpmnElement="Activity_0xfxwn7">
        <dc:Bounds x="880" y="178" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0rpxchz_di" bpmnElement="Activity_1k5qsys">
        <dc:Bounds x="440" y="178" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="GenericResource_0sinjjd_di" bpmnElement="GenericResource_0sinjjd">
        <dc:Bounds x="505" y="285" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="506" y="345" width="49" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="GenericResource_1ddvuww_di" bpmnElement="GenericResource_1ddvuww">
        <dc:Bounds x="655" y="285" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="652" y="345" width="57" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="GenericResource_15nlxuu_di" bpmnElement="GenericResource_15nlxuu">
        <dc:Bounds x="955" y="285" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="951" y="345" width="58" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1ewlh91_di" bpmnElement="Event_1m0d1gp">
        <dc:Bounds x="1102" y="200" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1083" y="243" width="74" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Association_0p6ui4a_di" bpmnElement="Association_0p6ui4a">
        <di:waypoint x="509" y="258" />
        <di:waypoint x="521" y="285" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_14hdjth_di" bpmnElement="Flow_14hdjth">
        <di:waypoint x="318" y="218" />
        <di:waypoint x="345" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0a8zc4r_di" bpmnElement="Flow_0a8zc4r">
        <di:waypoint x="540" y="218" />
        <di:waypoint x="600" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1feef5e_di" bpmnElement="Flow_1feef5e">
        <di:waypoint x="700" y="218" />
        <di:waypoint x="765" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_14f8dwg_di" bpmnElement="Flow_14f8dwg">
        <di:waypoint x="395" y="218" />
        <di:waypoint x="440" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1ut4qzf_di" bpmnElement="Flow_1ut4qzf">
        <di:waypoint x="790" y="243" />
        <di:waypoint x="790" y="380" />
        <di:waypoint x="370" y="380" />
        <di:waypoint x="370" y="243" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="727" y="386" width="86" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_10s6so5_di" bpmnElement="Flow_10s6so5">
        <di:waypoint x="815" y="218" />
        <di:waypoint x="880" y="218" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="808" y="186" width="64" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Association_00vv2y6_di" bpmnElement="Association_00vv2y6">
        <di:waypoint x="663" y="258" />
        <di:waypoint x="672" y="285" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Association_0xorop6_di" bpmnElement="Association_0xorop6">
        <di:waypoint x="952" y="258" />
        <di:waypoint x="966" y="285" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_11u9zmw_di" bpmnElement="Flow_11u9zmw">
        <di:waypoint x="980" y="218" />
        <di:waypoint x="1102" y="218" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
`;
}
