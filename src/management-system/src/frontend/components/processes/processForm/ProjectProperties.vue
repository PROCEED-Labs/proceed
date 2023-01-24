<template>
  <div>
    <v-row>
      <v-col>
        <v-text-field
          :label="`Project Code${isUsing5i ? '*' : ''}`"
          v-model="currentProcessData.orderCode"
          :rules="isUsing5i ? [inputRules.required] : []"
          counter="150"
          title="The project code is a short identifier for the project"
          :required="isUsing5i"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          :label="`Order No.${isUsing5i ? '*' : ''}`"
          v-model="currentProcessData.orderNumber"
          :rules="isUsing5i ? [inputRules.required] : []"
          counter="150"
          :required="isUsing5i"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          :label="`Customer${isUsing5i ? '*' : ''}`"
          v-model="currentProcessData.customerName"
          :rules="isUsing5i ? [inputRules.required] : []"
          counter="150"
          :required="isUsing5i"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          :label="`Customer Id`"
          v-model="currentProcessData.customerId"
          counter="150"
        ></v-text-field>
      </v-col>
    </v-row>
  </div>
</template>
<script>
import { initXml, getProcessIds, setMetaData, getMetaData } from '@proceed/bpmn-helper';
import processesDataInjectorMixin from './ProcessesDataInjectorMixin.vue';
import onSubmitInjectorMixin from './OnSubmitInjectorMixin.vue';

export default {
  mixins: [processesDataInjectorMixin, onSubmitInjectorMixin],
  props: {
    currentProcessData: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      inputRules: {
        required: (name) => !!name || 'Input required!',
      },
    };
  },
  computed: {
    isUsing5i() {
      return this.currentProcessData.isUsing5i;
    },
  },
  methods: {
    /**
     * This will transform the formData to the correct format for the xml meta elements
     *
     * @param {Object} formEntryData the current data inside a form entry
     * @returns {Object} the project meta info of the form in the correct format for the xml
     */
    formToMetaMapping({ name, orderNumber, orderCode, customerName, customerId }) {
      return {
        orderName: name,
        orderCode,
        orderNumber,
        customerName,
        customerId,
      };
    },
    /**
     * This will initialize empty form entry values with newly provided data without overwriting existing values
     *
     * @entry
     */
    getProjectMetaInfoChanges(entry, { orderCode, orderNumber, customerName, customerId }) {
      return {
        orderNumber: entry.orderNumber || orderNumber,
        orderCode: entry.orderCode || orderCode,
        customerName: entry.customerName || customerName,
        customerId: entry.customerId || customerId,
      };
    },
    /**
     * This function will ensure, that the project information inside the form is added to the bpmn of the process
     */
    async beforeSubmit(processFormData) {
      const metaInfo = this.formToMetaMapping(processFormData);

      if (!processFormData.bpmn) {
        processFormData.bpmn = initXml();
      }

      const [processId] = await getProcessIds(processFormData.bpmn);

      processFormData.bpmn = await setMetaData(processFormData.bpmn, processId, metaInfo);
    },
    /**
     * This will be called from a function in the mixin if the bpmn of a processesDataEntry changes
     *
     * It will read the project information from the bpmn to initialize the given entry
     *
     * @param {Object} entry the entry that changed
     * @returns {Object} the changes that should be added to the given entry
     */
    //
    async initProcessDataFromBPMN(currentData, changes) {
      const [processId] = await getProcessIds(changes.bpmn);
      const existingProjectInfo = { ...currentData, changes };
      return this.getProjectMetaInfoChanges(
        existingProjectInfo,
        await getMetaData(changes.bpmn, processId)
      );
    },
  },
};
</script>
