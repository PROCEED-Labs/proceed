import { type ResourceMetadata } from 'xmcp';

export const metadata: ResourceMetadata = {
  name: 'process-bpmn',
  title: 'Process BPMN',
  description: 'Business Process Model and Notation',
};

export default function handler() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             id="Definitions_1"
             targetNamespace="http://example.com/bpmn">

  <process id="OrderProcess" name="Order Process" isExecutable="true">
    <startEvent id="StartEvent_1" name="Order Received" />
    
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_CheckStock" />
    
    <task id="Task_CheckStock" name="Check Stock Availability" />
    
    <sequenceFlow id="Flow_2" sourceRef="Task_CheckStock" targetRef="Gateway_StockAvailable" />
    
    <exclusiveGateway id="Gateway_StockAvailable" name="Stock Available?" />
    
    <sequenceFlow id="Flow_3" sourceRef="Gateway_StockAvailable" targetRef="Task_ShipOrder">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[stockAvailable == true]]></conditionExpression>
    </sequenceFlow>
    
    <sequenceFlow id="Flow_4" sourceRef="Gateway_StockAvailable" targetRef="Task_NotifyCustomer">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[stockAvailable == false]]></conditionExpression>
    </sequenceFlow>
    
    <task id="Task_ShipOrder" name="Ship Order" />
    <task id="Task_NotifyCustomer" name="Notify Customer of Delay" />
    
    <sequenceFlow id="Flow_5" sourceRef="Task_ShipOrder" targetRef="EndEvent_Shipped" />
    <sequenceFlow id="Flow_6" sourceRef="Task_NotifyCustomer" targetRef="EndEvent_Notified" />
    
    <endEvent id="EndEvent_Shipped" name="Order Shipped" />
    <endEvent id="EndEvent_Notified" name="Customer Notified" />
  </process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_OrderProcess">
    <bpmndi:BPMNPlane id="BPMNPlane_OrderProcess" bpmnElement="OrderProcess" />
  </bpmndi:BPMNDiagram>
</definitions>
`;
}
