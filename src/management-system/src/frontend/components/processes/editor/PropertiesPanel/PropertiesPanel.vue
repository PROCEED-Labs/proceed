<template>
  <viewport-relative-resizable-window
    :canvasID="canvasID"
    :canvas="canvas"
    :initialMeasurements="windowMeasurements"
    title="PropertiesPanel"
    minWidth="400px"
    @close="$emit('close')"
    @resize="emitWindowMeasurements"
    @move="emitWindowMeasurements"
  >
    <template #header>
      <div class="text-center justify-center py-6">
        <h3>{{ businessObject.name ? businessObject.name : businessObject.id }}</h3>
      </div>
    </template>
    <v-card class="panel rounded-sm" elevation="6">
      <v-form>
        <v-container class="General">
          <p class="font-weight-medium">General</p>
          <v-text-field disabled label="Name" v-model="businessObject.name" filled />
          <v-text-field disabled label="Id" filled v-model="businessObject.id" />
          <boolean-bpmn-property-form-vue
            propertyName="external"
            label="External"
            :validFor="['bpmn:Task']"
          />
          <boolean-bpmn-property-form-vue
            v-if="showInstanceRecoveryFeature"
            propertyName="manualInterruptionHandling"
            label="Manual Interruption Handling"
            :validFor="['bpmn:FlowElement']"
            info="Will prevent automatic handling of the element or any nested element when the instance is continued after an unforeseen interruption. Manual handling will be required to continue the execution."
          />
          <milestone-selection v-if="isUserTask" />
        </v-container>
        <v-container>
          <p class="font-weight-medium">Image</p>
          <image-selection />
        </v-container>
        <v-container class="Properties" v-if="elementHasProperties">
          <p class="font-weight-medium">Properties</p>
          <v-text-field
            v-if="elementHasOccurrenceProbability"
            label="Occurrence Probability"
            ref="occurrenceProbability"
            :disabled="editingDisabled"
            suffix="%"
            type="number"
            min="0"
            max="100"
            :rules="[getOccurrenceProbabilityRule]"
            :placeholder="meta.occurrenceProbability ? meta.occurrenceProbability : 'e.g. 50'"
            v-model="metaCopy.occurrenceProbability"
            background-color="white"
            @blur="applyChange('occurrenceProbability')"
            filled
          />
          <inspection-plan-selection
            v-if="show5thIndustryFeature"
            :locked="true"
            :processType="processType"
            v-show="isProcessElement"
            v-model="metaCopy"
          />
          <inspection-order-selection
            v-if="show5thIndustryFeature"
            :processType="processType"
            v-show="
              isUserTask &&
              (rootMetaData['_5i-Inspection-Plan-ID'] ||
                rootMetaData['_5i-Inspection-Plan-Template-ID'])
            "
            v-model="metaCopy"
            :planId="
              rootMetaData['_5i-Inspection-Plan-ID'] ||
              rootMetaData['_5i-Inspection-Plan-Template-ID']
            "
            @changed="applyChange"
          />
          <v-text-field
            v-if="isUserTask"
            label="Priority"
            ref="defaultPriority"
            :disabled="editingDisabled"
            type="number"
            min="0"
            max="10"
            :rules="[inputRules.noNegativeValue, inputRules.valueBetween1And10]"
            :placeholder="meta.defaultPriority ? meta.defaultPriority : 'Enter value from 1 to 10'"
            v-model="metaCopy.defaultPriority"
            background-color="white"
            @blur="applyChange('defaultPriority')"
            filled
          />
          <v-text-field
            label="Planned Cost"
            ref="costsPlanned"
            :disabled="editingDisabled"
            :prefix="currency.symbol"
            type="number"
            min="0"
            :rules="[inputRules.noNegativeValue]"
            :placeholder="meta.costsPlanned ? meta.costsPlanned : 'e.g. 100'"
            v-model="metaCopy.costsPlanned"
            background-color="white"
            @blur="applyCostsPlanned"
            filled
          />
          <time-planned-form
            :disableEditing="editingDisabled"
            :processType="processType"
            :element="element"
            :meta="metaCopy"
            @change="applyMetaData($event)"
          ></time-planned-form>
        </v-container>
        <performer-form v-if="isUserTask" @change="applyPerformerChange"></performer-form>

        <MQTTForm
          v-if="isProcessElement"
          :storedServerInfo="metaCopy.mqttServer"
          @change="
            applyMetaData({
              mqttServer: {
                attributes: { ...$event },
              },
            })
          "
        ></MQTTForm>

        <resource-form :process="process" />

        <custom-property-form
          :meta="metaCopy"
          :disableEditing="editingDisabled"
          @change="applyCustomProperty"
        ></custom-property-form>

        <documentation-form />

        <flow-element-color />
      </v-form>
    </v-card>
  </viewport-relative-resizable-window>
</template>

<script>
import ViewportRelativeResizableWindow from '@/frontend/components/resizable-window/ViewportRelativeResizableWindow.vue';
import InspectionPlanSelection from '@/frontend/components/5thIndustry/inspectionPlanSelection.vue';
import inspectionOrderSelection from '@/frontend/components/5thIndustry/inspectionOrderSelection.vue';
import BooleanBpmnPropertyFormVue from './BooleanBpmnPropertyForm.vue';
import MilestoneSelection from '@/frontend/components/processes/editor/PropertiesPanel/MilestoneSelection.vue';
import TimePlannedForm from '@/frontend/components/processes/editor/PropertiesPanel/TimePlannedForm.vue';
import MQTTForm from '@/frontend/components/processes/editor/PropertiesPanel/MQTTForm.vue';
import PerformerForm from '@/frontend/components/processes/editor/PropertiesPanel/PerformerForm.vue';
import ResourceForm from '@/frontend/components/processes/editor/PropertiesPanel/resources/ResourceForm.vue';
import CustomPropertyForm from '@/frontend/components/processes/editor/PropertiesPanel/CustomPropertyForm.vue';
import DocumentationForm from '@/frontend/components/processes/editor/PropertiesPanel/DocumentationForm.vue';
import FlowElementColor from '@/frontend/components/processes/editor/PropertiesPanel/FlowElementColor.vue';
import { getMetaData } from '@/frontend/helpers/bpmn-modeler-events/getters.js';
import ImageSelection from '@/frontend/components/processes/editor/PropertiesPanel/ImageSelection.vue';

import {
  enableInterruptedInstanceRecovery,
  enable5thIndustryIntegration,
} from '../../../../../../../../FeatureFlags';

export default {
  name: 'PropertiesPanel',
  components: {
    ViewportRelativeResizableWindow,
    InspectionPlanSelection,
    inspectionOrderSelection,
    MilestoneSelection,
    TimePlannedForm,
    MQTTForm,
    PerformerForm,
    ResourceForm,
    CustomPropertyForm,
    BooleanBpmnPropertyFormVue,
    DocumentationForm,
    FlowElementColor,
    ImageSelection,
  },
  props: {
    canvasID: String,
    element: Object,
    processType: String,
    process: Object,
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    canvas() {
      const canvas = document.getElementById(this.canvasID).getBoundingClientRect();
      return {
        top: canvas.top + 80,
      };
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    customModeling() {
      return this.modeler.get('customModeling');
    },
    businessObject() {
      if (this.element) {
        return this.element.businessObject;
      }

      return {};
    },
    isProcessElement() {
      return this.element.type === 'bpmn:Process';
    },
    editingDisabled() {
      return this.$store.getters['processEditorStore/editingDisabled'];
    },
    isUserTask() {
      return this.element.type === 'bpmn:UserTask';
    },
    currency() {
      const environmentConfigSettings = this.$store.getters['environmentConfigStore/settings'];
      return environmentConfigSettings.currency;
    },
    customMetaData() {
      const {
        costsPlanned,
        timePlannedDuration,
        timePlannedOccurrence,
        timePlannedEnd,
        occurrenceProbability,
        orderNumber,
        orderName,
        orderCode,
        customerName,
        customerId,
        isUsing5i,
        defaultPriority,
        mqttServer,
        '_5i-Inspection-Plan-ID': inspectionPlanId,
        '_5i-Inspection-Plan-Title': inspectionPlanTitle,
        '_5i-API-Address': apiAddress,
        '_5i-Application-Address': applicationAddress,
        '_5i-Inspection-Order-ID': inspectionOrderId,
        '_5i-Inspection-Order-Code': inspectionOrderCode,
        '_5i-Inspection-Order-Shortdescription': inspectionOrderDescription,
        '_5i-Assembly-Group-ID': assemblyId,
        '_5i-Assembly-Group-Name': assemblyName,
        '_5i-Manufacturing-Step-ID': stepId,
        '_5i-Manufacturing-Step-Name': stepName,
        '_5i-Inspection-Plan-Template-ID': templateId,
        ...customMetaData
      } = this.metaCopy;
      return { ...customMetaData };
    },
    elementHasProperties() {
      return (
        this.element.type !== 'bpmn:MessageFlow' &&
        this.element.type !== 'bpmn:ParallelGateway' &&
        this.element.type !== 'bpmn:ExclusiveGateway' &&
        this.element.type !== 'bpmn:InclusiveGateway' &&
        this.element.type !== 'bpmn:EventBasedGateway' &&
        this.element.type !== 'bpmn:ComplexGateway'
      );
    },

    elementHasOccurrenceProbability() {
      return (
        this.element.type === 'bpmn:SequenceFlow' &&
        (this.element.source.type === 'bpmn:ExclusiveGateway' ||
          this.element.source.type === 'bpmn:InclusiveGateway' ||
          this.element.source.type === 'bpmn:EventBasedGateway')
      );
    },
  },
  data() {
    return {
      showInstanceRecoveryFeature: enableInterruptedInstanceRecovery,
      show5thIndustryFeature: enable5thIndustryIntegration,
      windowMeasurements: {
        right: `${this.convertPixelToVw(12)}vw`, // set right value to align with toolbar (padding 12px)
        top: `${this.convertPixelToVh(128)}vh`, // set top value to prevent overlay of tabbar (height 48px) and toolbar (height 80px)
        width: '25vw',
        height: '75vh',
      },
      tab: null,
      orderId5i: undefined,
      meta: {},
      rootMetaData: {},
      metaCopy: { ...this.meta },
      inputRules: {
        noNegativeValue: (value) => !value || value >= 0 || 'Planned Costs can not be negative',
        valueBetween0And100: (value) =>
          !value ||
          (value >= 0 && value <= 100) ||
          'Occurrence Probability must be between 0 and 100',
        valueBetween1And10: (value) =>
          !value || (value >= 1 && value <= 10) || 'Priority must be between 1 and 10',
        noDuplicate: (name) => !this.customMetaData[name] || 'Name already exists',
      },
    };
  },
  methods: {
    convertPixelToVw(valueInPixel) {
      return 100 * (valueInPixel / window.innerWidth);
    },
    convertPixelToVh(valueInPixel) {
      return 100 * (valueInPixel / window.innerHeight);
    },
    emitWindowMeasurements(changes) {
      this.windowMeasurements = changes;
    },
    applyCustomProperty(newCustomPropertyName, newCustomPropertyValue) {
      this.customModeling.updateMetaData(this.element.id, {
        property: { value: newCustomPropertyValue, attributes: { name: newCustomPropertyName } },
      });
    },
    applyMetaData(metaData) {
      this.customModeling.updateMetaData(this.element.id, metaData);
    },
    applyChange(type) {
      let metaData;
      if (Array.isArray(type)) {
        metaData = {};

        type.forEach((t) => (metaData[t] = this.metaCopy[t]));
      } else {
        const valid = this.$refs[type].validate();
        if (!valid) {
          return;
        }
        metaData = { [type]: this.metaCopy[type] };
      }

      this.applyMetaData(metaData);
    },
    applyCostsPlanned() {
      const valid = this.$refs['costsPlanned'].validate();
      if (!valid) {
        return;
      }

      const costsValue = this.metaCopy['costsPlanned'];
      const metaData = {};
      if (!costsValue) {
        metaData['costsPlanned'] = null;
      } else {
        metaData['costsPlanned'] = {
          value: costsValue,
          attributes: { unit: this.currency.cc },
        };
      }

      this.applyMetaData(metaData);
    },
    applyPerformerChange(performers) {
      this.customModeling.setUserTaskPerformers(this.element.id, performers);
    },
    getOccurrenceProbabilityRule(value) {
      if (!value) {
        return true;
      }

      const newSequenceFlowProbability = parseFloat(value);
      const sourceGateway = this.element.source;

      if (sourceGateway.type === 'bpmn:InclusiveGateway') {
        return (
          (newSequenceFlowProbability >= 0 && newSequenceFlowProbability <= 100) ||
          'Occurrence Probability must be between 0 and 100'
        );
      }
      // calculate total occurrence probablity values for exclusive/eventbased gateway
      const sourceGatewayTotalProbability = sourceGateway.outgoing.reduce((acc, sequenceFlow) => {
        if (sequenceFlow.id === this.element.id) {
          return acc + newSequenceFlowProbability;
        } else {
          const sequenceFlowMetaData = getMetaData(sequenceFlow);
          const sequenceFlowProbability = sequenceFlowMetaData.occurrenceProbability
            ? parseFloat(sequenceFlowMetaData.occurrenceProbability)
            : 0;

          return acc + sequenceFlowProbability;
        }
      }, 0);

      return (
        sourceGatewayTotalProbability <= 100 ||
        'Total Occurrence Probability of outgoing Sequence Flows for this Gateway can not be above 100'
      );
    },
  },
  watch: {
    businessObject() {
      this.orderId5i = this.businessObject.orderId5i;
    },
    meta(newMeta) {
      this.metaCopy = { ...newMeta };
    },
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const proceedMeta = newModeler.get('proceedMeta');
          const eventBus = newModeler.get('eventBus');

          this.meta = proceedMeta.getSelectedElementMetaData();
          eventBus.on('proceedMeta.selected.changed', ({ newMetaData }) => {
            this.meta = newMetaData;
          });

          this.rootMetaData = proceedMeta.getRootMetaData();
          eventBus.on('proceedMeta.root.changed', ({ newRootMetaData }) => {
            this.rootMetaData = newRootMetaData;
          });
        }
      },
      immediate: true,
    },
  },
};
</script>

<style scoped>
.panel {
  overflow-y: auto;
  height: calc(100% - 48px);
}
.v-color-picker__input {
  font-size: 12px !important;
}
</style>
