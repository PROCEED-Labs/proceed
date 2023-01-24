<template>
  <inspection-plan-selection
    v-model="processData"
    :processType="processType"
    :showTemplates="isProject"
    :isInProcessForm="true"
  />
</template>
<script>
import InspectionPlanSelection from '@/frontend/components/5thIndustry/inspectionPlanSelection.vue';
import { getProcessIds, initXml, setMetaData, getMetaData } from '@proceed/bpmn-helper';
import {
  remove5thIndustryDataFromXml,
  createPlan,
  setUserTasksTo5thIndustry,
} from '@/frontend/components/5thIndustry/5thIndustryHelper.js';
import processesDataInjectorMixin from './ProcessesDataInjectorMixin.vue';
import onSubmitInjectorMixin from './OnSubmitInjectorMixin.vue';

export default {
  mixins: [processesDataInjectorMixin, onSubmitInjectorMixin],
  name: 'fifth-industry-properties',
  components: { InspectionPlanSelection },
  props: {
    processType: {
      type: String,
      required: true,
    },
    currentData: {
      type: Object,
      required: true,
    },
    currentIndex: {
      type: Number,
      required: true,
    },
  },
  computed: {
    processData: {
      get() {
        return {
          isUsing5i: this.currentData.isUsing5i,
          '_5i-Inspection-Plan-ID': this.currentData['_5i-Inspection-Plan-ID'],
          '_5i-Inspection-Plan-Template-ID': this.currentData['_5i-Inspection-Plan-Template-ID'],
          '_5i-Inspection-Plan-Title': this.currentData['_5i-Inspection-Plan-Title'],
          '_5i-API-Address': this.currentData['_5i-API-Address'],
          '_5i-Application-Address': this.currentData['_5i-Application-Address'],
        };
      },
      set(val) {
        if (this.processType === 'process') {
          return;
        }

        // use the Plan Title as name if there is no user provided name
        val.name = this.currentData.name || val.orderName;
        this.updateData(this.currentIndex, val);
      },
    },
    isProject() {
      return this.processType === 'project';
    },
  },
  methods: {
    /**
     * This will be called from the onSubmitInjectorMixin
     *
     * It will ensure that the 5thIndustry informations of the process are correctly set inside the bpmn
     */
    async beforeSubmit(processFormData) {
      if (processFormData.type === 'process' || !processFormData.isUsing5i) {
        // make sure to remove every 5thIndustry reference from processes that are not supposed to use it
        if (processFormData.bpmn) {
          processFormData = await remove5thIndustryDataFromXml(processFormData);
        }
      } else {
        // making sure there is a bpmn to extend
        if (!processFormData.bpmn) {
          processFormData.bpmn = initXml();
        }

        const [processId] = await getProcessIds(processFormData.bpmn);

        const {
          '_5i-Inspection-Plan-ID': planIdInBPMN,
          '_5i-Inspection-Plan-Template-ID': planTemplateIdInBPMN,
        } = await getMetaData(processFormData.bpmn, processId);

        if (
          (processFormData.type === 'project' &&
            planIdInBPMN !== processFormData['_5i-Inspection-Plan-ID']) ||
          (processFormData.type === 'template' &&
            planTemplateIdInBPMN !== processFormData['_5i-Inspection-Plan-Template-ID'])
        ) {
          // remove old inspection order information if a different plan from the one in the bpmn is selected
          processFormData = await remove5thIndustryDataFromXml(processFormData);
        }

        // create a new plan if there is a template id selected and this is a project
        if (!processFormData['_5i-Inspection-Plan-ID'] && processFormData.type === 'project') {
          const { bpmn } = processFormData;
          const { newPlanId, newBpmn } = await createPlan(
            {
              title: processFormData.name,
              customer: processFormData.customerName,
              customerOrderNo: processFormData.orderNumber,
              jobName: processFormData.orderCode,
            },
            processFormData['_5i-Inspection-Plan-Template-ID'],
            bpmn
          );
          processFormData.bpmn = newBpmn;
          processFormData['_5i-Inspection-Plan-ID'] = newPlanId;
          processFormData['_5i-Inspection-Plan-Title'] = processFormData.name;
        }

        // set 5thIndustry information on the bpmn
        processFormData.bpmn = await setMetaData(processFormData.bpmn, processId, {
          '_5i-Inspection-Plan-ID': processFormData['_5i-Inspection-Plan-ID'],
          '_5i-Inspection-Plan-Template-ID': processFormData['_5i-Inspection-Plan-Template-ID'],
          '_5i-Inspection-Plan-Title': processFormData['_5i-Inspection-Plan-Title'],
          '_5i-API-Address': processFormData['_5i-API-Address'],
          '_5i-Application-Address': processFormData['_5i-Application-Address'],
        });

        processFormData.bpmn = await setUserTasksTo5thIndustry(processFormData.bpmn);
      }
    },
    // this will be called from a function in the mixin if the bpmn of a processesDataEntry changes
    async initProcessDataFromBPMN(_, changes) {
      if (this.processType === 'process') {
        // we dont use 5thIndustry for processes
        return { isUsing5i: false };
      }

      const [processId] = await getProcessIds(changes.bpmn);
      const metaData = await getMetaData(changes.bpmn, processId);
      return {
        isUsing5i:
          metaData['_5i-Inspection-Plan-ID'] || metaData['_5i-Inspection-Plan-Template-ID'],
        '_5i-Inspection-Plan-ID': metaData['_5i-Inspection-Plan-ID'],
        '_5i-Inspection-Plan-Template-ID': metaData['_5i-Inspection-Plan-Template-ID'],
        '_5i-API-Address': metaData['_5i-API-Address'],
        '_5i-Application-Address': metaData['_5i-Application-Address'],
        '_5i-Inspection-Plan-Title': metaData['_5i-Inspection-Plan-Title'],
      };
    },
  },
};
</script>
