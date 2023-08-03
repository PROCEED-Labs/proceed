<template>
  <div>
    <popup :popupData="popupData" />
    <process-form
      ref="baseForm"
      action="Import"
      :processType="type"
      :show="show"
      @process="$emit('process', $event)"
      @done="$emit('done', $event)"
      @cancel="$emit('cancel')"
    >
      <template #bpmn-info>
        <!-- Opens File Select Dialog for Import -->
        <v-row class="mb-5">
          <v-col cols="12" sm="12" md="12">
            <!-- value is https://developer.mozilla.org/en-US/docs/Web/API/File -->
            <v-file-input
              v-model="importedFile"
              ref="fileInput"
              label="BPMN or Zip File*"
              placeholder="Click to select BPMN or Zip File"
              accept=".bpmn,.xml,.zip"
              counter
              clearable
              persistent-hint
              hint="You can import an existing BPMN File or an existing Zip File"
              :rules="[fileRule]"
              @change="importSelectedFile"
              @click:clear="reset"
            ></v-file-input>
          </v-col>
        </v-row>
      </template>
    </process-form>
  </div>
</template>

<script>
import ProcessForm from './ProcessForm.vue';
import AlertWindow from '@/frontend/components/universal/Alert.vue';

import { getProcessFiles, analyseBPMNFile } from './process-import.js';
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
 * This is a dialog used to import processes
 *
 * it provides functionality for importing and then editing processes as well as for warning about and solving problems that might occur due to the import
 *
 * @memberof module:components.module:processes
 * @module Vue:ImportProcessForm
 *
 * @vue-prop {Boolean} show - if the component is currently open (mostly used to reset after closing and to open the file browser on opening)
 * @vue-prop {String} type - the type of process to import (e.g. process, project, ...)
 *
 * @vue-computed {boolean} canStoreLocally - if the component is executed in a browser environment that allows storing data
 * @vue-computed {Process[]} storedProcesses - all processes from the vuex store
 * @vue-computed {Process[]} storedInBackend - all processes that are stored in the backend and not locally in the browser
 * @vue-computed {String[]} departmentNames - names of all possible departments
 * @vue-computed {*} departments - all possible departments
 * @vue-computed {number} currentIndex - the current displayed Page minus 1 (index in array)
 *
 * @vue-event {undefined} done - if the process import was successfully executed
 * @vue-event {(Object<Process>|null)} process - information about the process that was imported (null when more than one)
 * @vue-event {undefined} cancel - if the form should be closed without the intention of doing anything (abort)
 */
export default {
  name: 'process-import-form',
  mixins: [processesDataProviderMixin],
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
  components: {
    popup: AlertWindow,
    ProcessForm,
  },
  data() {
    return {
      /** */
      popupData: {
        body: '',
        display: 'none',
        color: 'info',
      },
      /**
       * The selected file in the input form
       * {@link https://developer.mozilla.org/en-US/docs/Web/API/File}
       *
       * @type {File}
       */
      importedFile: null,
      fileRule: (file) => !!file || 'File is required',
    };
  },
  methods: {
    /**
     * Imports the file that was selected
     *
     * Process relevant information is imported into the processForm
     *
     * It shows errors, if
     *   1. the selected file is empty
     *   2. the selected file contains no BPMN XML
     *
     */
    async importSelectedFile() {
      try {
        if (!this.importedFile) {
          return;
        }
        // get data from the import file (bpmn or zip file)
        let processesData = await getProcessFiles(this.importedFile);

        // deduce information needed for import from provided information and existing/stored information
        processesData = await asyncMap(
          processesData,
          async ({ fileName, bpmnFileAsXml, bpmnFileAsObject, htmlData, imageData }) => {
            const processData = await analyseBPMNFile(
              bpmnFileAsObject,
              htmlData,
              imageData,
              this.$store,
              this.type,
              fileName
            );

            return { ...processData, bpmn: bpmnFileAsXml };
          }
        );

        this.setProcessesData(processesData);
      } catch ({ message }) {
        this.popupData.body = message;
        this.popupData.color = 'error';
        this.popupData.display = 'block';
        this.reset();
      }
    },

    openFileExplorer() {
      this.$nextTick(() => {
        this.$refs['fileInput'].$refs.input.click();
      });
    },
    /**
     * Resets ImportForm to not carry over data from one import to another
     */
    reset() {
      this.setProcessesData([]);
      this.importedFile = undefined;
    },
  },
  watch: {
    show: {
      handler(isShown) {
        if (isShown) {
          this.reset();
          this.openFileExplorer();
        } else {
          this.reset();
        }
      },
      immediate: true,
    },
  },
};
</script>
