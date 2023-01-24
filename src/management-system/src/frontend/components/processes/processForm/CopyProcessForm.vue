<template>
  <process-form
    :processType="type"
    @process="$emit('process', $event)"
    @done="$emit('done')"
    :show="show"
    action="Copy"
    @cancel="$emit('cancel')"
  >
    <template #title="{ numProcesses }"> Copy Process{{ numProcesses > 1 ? 'es' : '' }} </template>
    <template #actions="{ confirm, isFormValid, numProcesses, isSubmitting }">
      <v-btn @click="$emit('cancel')">Cancel</v-btn>
      <v-btn :loading="isSubmitting" :disabled="!isFormValid" color="primary" @click="confirm"
        >Copy Process{{ numProcesses > 1 ? 'es' : '' }}</v-btn
      >
    </template>
  </process-form>
</template>
<script>
import ProcessForm from './ProcessForm.vue';
import { generateDefinitionsId } from '@proceed/bpmn-helper';
import processesDataProviderMixin from './ProcessesDataProviderMixin.vue';
import { asyncMap } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This is a dialog used to copy processes
 *
 * @memberof module:components.module:processes
 * @module Vue:CopyProcessForm
 *
 * @vue-prop {Boolean} processesToBeCopied - the processes that are supposed to be copied
 *
 * @vue-event {undefined} done - signals that copying the process was successfull
 * @vue-event {(Object<Process>|null)} process - the process copy that was created (null when more than one)
 * @vue-event {undefined} cancel - if the form should be closed without the intention of doing anything (abort)
 */
export default {
  mixins: [processesDataProviderMixin],
  components: {
    ProcessForm,
  },
  props: {
    processesToBeCopied: {
      type: Array,
      required: true,
    },
    show: {
      type: Boolean,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
  },
  watch: {
    show: {
      async handler(isShown) {
        if (isShown) {
          const processesData = await asyncMap(this.processesToBeCopied, async (process) => {
            let bpmn = await this.$store.getters['processStore/xmlById'](process.id);

            return {
              id: generateDefinitionsId(),
              name: `${process.name} COPY`,
              bpmn,
              originalStoredProcessId: process.id,
            };
          });
          this.setProcessesData(processesData);
        } else {
          this.setProcessesData([]);
        }
      },
      immediate: true,
    },
  },
};
</script>
