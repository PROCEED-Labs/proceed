<template>
  <process-form
    action="Edit"
    :processType="type"
    :show="show"
    @done="$emit('done')"
    @cancel="$emit('cancel')"
  >
    <template #actions="{ confirm, isFormValid, mainAction, isSubmitting }">
      <v-btn @click="$emit('cancel')">Cancel</v-btn>
      <v-btn :loading="isSubmitting" :disabled="!isFormValid" color="primary" @click="confirm">{{
        mainAction
      }}</v-btn>
    </template>
  </process-form>
</template>

<script>
import ProcessForm from './ProcessForm.vue';

import processesDataProviderMixin from './ProcessesDataProviderMixin.vue';

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This is a dialog used to edit processes
 *
 * it is basically just a wrapper for the ProcessForm component with some changes in the title and button text
 *
 * @memberof module:components.module:processes
 * @module Vue:EditProcessForm
 *
 * @vue-prop {Process} processToBeEdited - the process we want to edit
 * @vue-prop {String} type - the type of process to edit (e.g. process, project, ...)
 *
 * @vue-event {undefined} done - signals that editing the process was successfull
 * @vue-event {undefined} cancel - if the form should be closed without the intention of doing anything (abort)
 */
export default {
  mixins: [processesDataProviderMixin],
  components: {
    ProcessForm,
  },
  props: {
    processToBeEdited: {
      type: Object,
      required: false,
    },
    type: {
      type: String,
      required: false,
      default: 'process',
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  watch: {
    /**
     * Gets the necessary information from the provided process and loads it into the ProcessForm
     */
    processToBeEdited: {
      async handler(process) {
        if (!process) {
          this.setProcessesData([]);
        } else {
          let bpmn = await this.$store.getters['processStore/xmlById'](this.processToBeEdited.id);
          const processData = {
            id: process.id,
            name: process.name,
            bpmn,
            originalStoredProcessId: process.id,
          };
          this.setProcessesData([processData]);
        }
      },
      // run the code of this watcher on mount
      immediate: true,
    },
  },
};
</script>
