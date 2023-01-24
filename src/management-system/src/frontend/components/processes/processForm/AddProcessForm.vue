<template>
  <div>
    <process-form
      action="Add"
      :processType="type"
      :show="show"
      @cancel="$emit('cancel')"
      @process="$emit('process', $event)"
      @done="$emit('done')"
    >
      <template #bpmn-info>
        <v-row v-if="templateProcess">
          <v-col>Based on Template: {{ templateProcess.name }}</v-col></v-row
        >
      </template>
      <!-- Allow the Subprocess Selection to override slots inside the nested ProcessForm -->
      <template v-if="$scopedSlots.title" #title><slot name="title"></slot></template>
      <template v-if="$scopedSlots['title-action']" #title-action>
        <slot name="title-action"></slot>
      </template>
      <template v-if="$scopedSlots.main" #main><slot name="main"></slot></template>
      <template #actions="{ confirm, cancel, isFormValid, mainAction, isSubmitting }">
        <slot
          name="actions"
          :confirm="confirm"
          :cancel="cancel"
          :isFormValid="isFormValid"
          :mainAction="mainAction"
        >
          <v-btn @click="$emit('cancel')">Cancel</v-btn>
          <v-btn
            color="secondary"
            v-if="!isTemplate && !templateProcess"
            @click="addTemplateDialog = true"
            >Select Template</v-btn
          >
          <v-btn color="secondary" v-else-if="!isTemplate && templateProcess" @click="resetTemplate"
            >Reset Template</v-btn
          >
          <v-btn
            :loading="isSubmitting"
            :disabled="!isFormValid"
            color="primary"
            @click="confirm"
            >{{ mainAction }}</v-btn
          >
        </slot>
      </template>
    </process-form>
    <ProcessModal
      v-if="!isTemplate"
      :isTemplateMode="true"
      :show="addTemplateDialog"
      maxWidth="800px"
      @selectTemplate="handleTemplate"
      @cancel="addTemplateDialog = false"
    ></ProcessModal>
  </div>
</template>
<script>
import ProcessForm from './ProcessForm.vue';
import ProcessModal from '@/frontend/components/processes/editor/ProcessModal.vue';
import { setTemplateId, setDefinitionsId, setTargetNamespace } from '@proceed/bpmn-helper';

import processesDataProviderMixin from './ProcessesDataProviderMixin.vue';

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This is a dialog used to add processes
 *
 * it is basically just a wrapper for the ProcessForm component with some changes in the title and button text
 *
 * @memberof module:components.module:processes
 * @module Vue:AddProcessForm
 *
 * @vue-prop {Boolean} show - if the component is currently open (mostly used to reset after closing)
 * @vue-prop {String} type - the type of process that will be added (e.g. process, project, ...)
 *
 * @vue-event {undefined} done - signals that adding the process was successfull
 * @vue-event {(Object<Process>|null)} process - the process that was added (null when more than one)
 * @vue-event {undefined} cancel - if the form should be closed without the intention of doing anything (abort)
 */
export default {
  mixins: [processesDataProviderMixin],
  components: {
    ProcessForm,
    ProcessModal,
  },
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    type: {
      type: String,
      required: false,
      default: 'process',
    },
  },
  computed: {
    isTemplate() {
      return this.type === 'template';
    },
  },
  data() {
    return {
      addTemplateDialog: false,
      templateProcess: null,
    };
  },
  methods: {
    /**
     * Retrieve process-information (bpmnFile, userTasks) from template process and store these in data-array
     */
    async handleTemplate(process) {
      this.addTemplateDialog = false;
      this.templateProcess = process;

      let bpmn = await this.$store.getters['processStore/xmlById'](process.id);

      bpmn = await setTemplateId(bpmn, process.id);
      // set definitions id and targetNamespace to undefined so they aren't stored as originalId and originalTargetNamespace when being replaced with the new ones (this functionality is for imports from other Editors)
      bpmn = await setDefinitionsId(bpmn, undefined);
      bpmn = await setTargetNamespace(bpmn, undefined);

      this.updateProcessesData(0, {
        bpmn,
        originalStoredProcessId: process.id,
      });
    },
    resetTemplate() {
      this.updateProcessesData(0, {
        bpmn: null,
        originalStoredProcessId: null,
      });
      this.templateProcess = null;
    },
  },
  watch: {
    show: {
      handler(isShown) {
        if (isShown) {
          this.setProcessesData([{}]);
        } else {
          this.setProcessesData([]);
          this.templateProcess = null;
        }
      },
      immediate: true,
    },
  },
};
</script>
