<template>
  <v-app>
    <v-app-bar app color="#84c767" dark>
      <div class="d-flex align-center">
        <v-img
          alt="PROCEED"
          class="shrink mr-2"
          contain
          src="https://docs.proceed-labs.org/images/logo.png"
          transition="scale-transition"
          width="250px"
        />
      </div>
      <v-spacer />

      <v-btn href="https://docs.proceed-labs.org/about/" target="_blank" text>
        <span class="mr-2">About this project</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>
    <v-main>
      <SplitPane :min-percent="25" :default-percent="40" split="vertical">
        <ConfigurationAndImport @startDerivation="deriveProcess($event)" slot="paneL" />

        <ProcessPreview
          v-if="this.bpmnString"
          :bpmnString="this.bpmnString"
          :processName="this.processSettings.name"
          slot="paneR"
        />
      </SplitPane>
    </v-main>
  </v-app>
</template>

<script>
import ConfigurationAndImport from './components/ConfigurationAndImport';
import ProcessPreview from './components/ProcessPreview';
import SplitPane from 'vue-splitpane';
import { deriveProcessFromExcel } from '../../src/main.js';

export default {
  name: 'App',

  components: {
    ConfigurationAndImport: ConfigurationAndImport,
    ProcessPreview: ProcessPreview,
    SplitPane,
  },

  methods: {
    deriveProcess(data) {
      this.excelBinary = data.excelBinary;
      this.processSettings = data.processSettings;
      this.columnMappings = data.columnMappings;

      deriveProcessFromExcel(data.processSettings, data.excelBinary, data.columnMappings).then(
        (bpmnString) => {
          this.bpmnString = bpmnString;
        }
      );
    },
  },

  data: () => ({
    processData: {},
    processSettings: {},
    bpmnString:
      '<?xml version="1.0" encoding="UTF-8"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="sid-38422fae-e03e-43a3-bef4-bd33b32041b2" targetNamespace="http://bpmn.io/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="12.0.0">  <process id="Process_1" isExecutable="false">    <startEvent id="StartEvent_1y45yut">      <outgoing>Flow_020q0q9</outgoing>    </startEvent>    <task id="Task_1hcentk" name="Click left to upload a BOM File">      <incoming>Flow_0dwyiii</incoming>      <outgoing>Flow_1iwrr9w</outgoing>    </task>    <sequenceFlow id="Flow_1iwrr9w" sourceRef="Task_1hcentk" targetRef="Activity_1ywe3ew" />    <exclusiveGateway id="Gateway_1he5rbh" name="File format correct?" default="Flow_1phxrib">      <incoming>Flow_00majn5</incoming>      <outgoing>Flow_0v4es48</outgoing>      <outgoing>Flow_1phxrib</outgoing>    </exclusiveGateway>    <task id="Activity_048umvr" name="Map the unknown column names">      <incoming>Flow_0v4es48</incoming>      <outgoing>Flow_1rmn0hv</outgoing>    </task>    <sequenceFlow id="Flow_0v4es48" name="no" sourceRef="Gateway_1he5rbh" targetRef="Activity_048umvr" />    <task id="Activity_1ywe3ew" name="Specify the derivation settings">      <incoming>Flow_1iwrr9w</incoming>      <outgoing>Flow_00majn5</outgoing>    </task>    <sequenceFlow id="Flow_00majn5" sourceRef="Activity_1ywe3ew" targetRef="Gateway_1he5rbh" />    <exclusiveGateway id="Gateway_1gsk073">      <incoming>Flow_1phxrib</incoming>      <incoming>Flow_1rmn0hv</incoming>      <outgoing>Flow_0015vtx</outgoing>    </exclusiveGateway>    <sequenceFlow id="Flow_1phxrib" sourceRef="Gateway_1he5rbh" targetRef="Gateway_1gsk073" />    <sequenceFlow id="Flow_1rmn0hv" sourceRef="Activity_048umvr" targetRef="Gateway_1gsk073" />    <task id="Activity_14jubar" name="Click on start derivation">      <incoming>Flow_0015vtx</incoming>      <outgoing>Flow_0wwwg5p</outgoing>    </task>    <sequenceFlow id="Flow_0015vtx" sourceRef="Gateway_1gsk073" targetRef="Activity_14jubar" />    <task id="Activity_0xlz7d6" name="Check the process on the right">      <incoming>Flow_0wwwg5p</incoming>      <outgoing>Flow_15ekxbb</outgoing>    </task>    <sequenceFlow id="Flow_0wwwg5p" sourceRef="Activity_14jubar" targetRef="Activity_0xlz7d6" />    <task id="Activity_0cf4at3" name="Click on download BPMN">      <incoming>Flow_15ekxbb</incoming>      <outgoing>Flow_1xzfys4</outgoing>    </task>    <sequenceFlow id="Flow_15ekxbb" sourceRef="Activity_0xlz7d6" targetRef="Activity_0cf4at3" />    <endEvent id="Event_156o2yx">      <incoming>Flow_1xzfys4</incoming>    </endEvent>    <sequenceFlow id="Flow_1xzfys4" sourceRef="Activity_0cf4at3" targetRef="Event_156o2yx" />    <task id="Activity_1gpb6m9" name="Make sure your file meets the requirements">      <incoming>Flow_0p62rfu</incoming>      <outgoing>Flow_0dwyiii</outgoing>    </task>    <sequenceFlow id="Flow_0dwyiii" sourceRef="Activity_1gpb6m9" targetRef="Task_1hcentk" />    <task id="Activity_0eug8oj" name="Export your data from SAP">      <incoming>Flow_020q0q9</incoming>      <outgoing>Flow_0p62rfu</outgoing>    </task>    <sequenceFlow id="Flow_020q0q9" sourceRef="StartEvent_1y45yut" targetRef="Activity_0eug8oj" />    <sequenceFlow id="Flow_0p62rfu" sourceRef="Activity_0eug8oj" targetRef="Activity_1gpb6m9" />    <textAnnotation id="TextAnnotation_1riqkw1">      <text>Your file must include exactly one BOM. It can include any number of allocations and operations.\n\nBe sure to name the sheets correctly:\nMaterialID1_BOM\nMaterialID2_Allocations\nMaterialID3_Operations</text>    </textAnnotation>    <association id="Association_0okl9tn" sourceRef="Activity_1gpb6m9" targetRef="TextAnnotation_1riqkw1" />  </process>  <bpmndi:BPMNDiagram id="BpmnDiagram_1">    <bpmndi:BPMNPlane id="BpmnPlane_1" bpmnElement="Process_1">      <bpmndi:BPMNShape id="TextAnnotation_1riqkw1_di" bpmnElement="TextAnnotation_1riqkw1">        <omgdc:Bounds x="136" y="20" width="308.5155670867309" height="112.67605633802818" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Task_1hcentk_di" bpmnElement="Task_1hcentk">        <omgdc:Bounds x="240" y="190" width="100" height="80" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Gateway_1he5rbh_di" bpmnElement="Gateway_1he5rbh" isMarkerVisible="true">        <omgdc:Bounds x="575" y="205" width="50" height="50" />        <bpmndi:BPMNLabel>          <omgdc:Bounds x="573" y="168" width="53" height="27" />        </bpmndi:BPMNLabel>      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Activity_048umvr_di" bpmnElement="Activity_048umvr">        <omgdc:Bounds x="650" y="270" width="100" height="80" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Activity_1ywe3ew_di" bpmnElement="Activity_1ywe3ew">        <omgdc:Bounds x="400" y="190" width="100" height="80" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Gateway_1gsk073_di" bpmnElement="Gateway_1gsk073" isMarkerVisible="true">        <omgdc:Bounds x="775" y="205" width="50" height="50" />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Activity_14jubar_di" bpmnElement="Activity_14jubar">        <omgdc:Bounds x="890" y="190" width="100" height="80" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Activity_0xlz7d6_di" bpmnElement="Activity_0xlz7d6">        <omgdc:Bounds x="1060" y="190" width="100" height="80" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Activity_0cf4at3_di" bpmnElement="Activity_0cf4at3">        <omgdc:Bounds x="1230" y="190" width="100" height="80" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Event_156o2yx_di" bpmnElement="Event_156o2yx">        <omgdc:Bounds x="1402" y="212" width="36" height="36" />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Activity_1gpb6m9_di" bpmnElement="Activity_1gpb6m9">        <omgdc:Bounds x="70" y="190" width="100" height="80" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="Activity_0eug8oj_di" bpmnElement="Activity_0eug8oj">        <omgdc:Bounds x="-100" y="190" width="100" height="80" />        <bpmndi:BPMNLabel />      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="StartEvent_1y45yut_di" bpmnElement="StartEvent_1y45yut">        <omgdc:Bounds x="-198" y="212" width="36" height="36" />        <bpmndi:BPMNLabel>          <omgdc:Bounds x="134" y="145" width="73" height="14" />        </bpmndi:BPMNLabel>      </bpmndi:BPMNShape>      <bpmndi:BPMNEdge id="Association_0okl9tn_di" bpmnElement="Association_0okl9tn">        <omgdi:waypoint x="134" y="190" />        <omgdi:waypoint x="153" y="133" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_1iwrr9w_di" bpmnElement="Flow_1iwrr9w">        <omgdi:waypoint x="340" y="230" />        <omgdi:waypoint x="400" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_0v4es48_di" bpmnElement="Flow_0v4es48">        <omgdi:waypoint x="600" y="255" />        <omgdi:waypoint x="600" y="310" />        <omgdi:waypoint x="650" y="310" />        <bpmndi:BPMNLabel>          <omgdc:Bounds x="609" y="278" width="13" height="14" />        </bpmndi:BPMNLabel>      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_00majn5_di" bpmnElement="Flow_00majn5">        <omgdi:waypoint x="500" y="230" />        <omgdi:waypoint x="575" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_1phxrib_di" bpmnElement="Flow_1phxrib">        <omgdi:waypoint x="625" y="230" />        <omgdi:waypoint x="775" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_1rmn0hv_di" bpmnElement="Flow_1rmn0hv">        <omgdi:waypoint x="750" y="310" />        <omgdi:waypoint x="800" y="310" />        <omgdi:waypoint x="800" y="255" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_0015vtx_di" bpmnElement="Flow_0015vtx">        <omgdi:waypoint x="825" y="230" />        <omgdi:waypoint x="890" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_0wwwg5p_di" bpmnElement="Flow_0wwwg5p">        <omgdi:waypoint x="990" y="230" />        <omgdi:waypoint x="1060" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_15ekxbb_di" bpmnElement="Flow_15ekxbb">        <omgdi:waypoint x="1160" y="230" />        <omgdi:waypoint x="1230" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_1xzfys4_di" bpmnElement="Flow_1xzfys4">        <omgdi:waypoint x="1330" y="230" />        <omgdi:waypoint x="1402" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_0dwyiii_di" bpmnElement="Flow_0dwyiii">        <omgdi:waypoint x="170" y="230" />        <omgdi:waypoint x="240" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_020q0q9_di" bpmnElement="Flow_020q0q9">        <omgdi:waypoint x="-162" y="230" />        <omgdi:waypoint x="-100" y="230" />      </bpmndi:BPMNEdge>      <bpmndi:BPMNEdge id="Flow_0p62rfu_di" bpmnElement="Flow_0p62rfu">        <omgdi:waypoint x="0" y="230" />        <omgdi:waypoint x="70" y="230" />      </bpmndi:BPMNEdge>    </bpmndi:BPMNPlane>  </bpmndi:BPMNDiagram></definitions>',
  }),
};
</script>
