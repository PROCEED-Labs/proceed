<template>
  <div>
    <tooltip-button
      v-if="selectedElement.type === 'bpmn:CallActivity'"
      @click="openSelectionDialog"
    >
      <template #tooltip-text>Select Process</template>
      mdi-wrench-outline
    </tooltip-button>
    <tooltip-button
      v-if="selectedElement.type === 'bpmn:CallActivity'"
      :disabled="!hasSelectedImportProcess"
      @click="openCalledProcessModeler"
    >
      <template #tooltip-text>Open Call Activity in Editor</template>
      mdi-open-in-new
    </tooltip-button>
    <v-dialog v-model="isCallActivityDialogVisible" scrollable max-width="800px">
      <v-card>
        <v-card-title>
          <span class="headline mx-0"> Set Subprocess </span>
        </v-card-title>
        <v-card-text style="padding: 8px 30px 20px">
          <v-container class="pa-0">
            <v-row>
              <v-col class="py-0" cols="12" sm="12" md="12">
                <v-autocomplete
                  label="Select Process"
                  color="primary"
                  v-model="selectedProcess"
                  :filter="filterProcesses"
                  :items="selectableProcesses"
                  item-text="name"
                  return-object
                  clearable
                  @input="selectedVersion = null"
                >
                </v-autocomplete>
                <v-autocomplete
                  label="Select Version"
                  color="primary"
                  v-model="selectedVersion"
                  :items="selectableVersions"
                  item-text="name"
                  return-object
                  clearable
                >
                </v-autocomplete>
              </v-col>
            </v-row>
            <v-row v-if="selectedProcess">
              <v-col cols="12" sm="12" md="12">
                <BpmnPreview
                  viewerMode="navigated-viewer"
                  :process="selectedProcess"
                  :version="selectedVersion"
                ></BpmnPreview>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="isCallActivityDialogVisible = false">Cancel</v-btn>
          <v-btn color="primary" @click="setProcessAndVersion(selectedProcess, selectedVersion)"
            >Set Subprocess</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import BpmnPreview from '@/frontend/components/bpmn/BpmnPreview.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

import { getDefinitionsInfoForCallActivity } from '@/frontend/helpers/bpmn-modeler-events/getters.js';

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This is a dialog used to select a process to be used in a callActivity
 *
 * @memberof module:components.module:processes
 * @module Vue:SubprocessSelection
 *
 * @vue-prop {Process} process - the process containing the callActivity
 *
 * @vue-event {undefined} done - signals that we are done selecting
 * @vue-event {(Object<Process>|null)} process - the process that was selected
 * @vue-event {undefined} cancel - if the form should be closed without the intention of doing anything (abort)
 */
export default {
  components: { BpmnPreview, TooltipButton },

  props: {
    process: { type: Object, required: true },
  },
  data() {
    return {
      currentElementSelectedProcess: null,
      currentElementSelectedVersion: null,

      /** Processes that can be selected for a callActivity */
      selectableProcesses: [],

      /** The process that was newly selected */
      selectedProcess: null,

      selectedVersion: null,

      isCallActivityDialogVisible: false,
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    hasSelectedImportProcess() {
      return this.currentElementSelectedProcess && this.currentElementSelectedVersion;
    },
    selectableVersions() {
      if (this.selectedProcess) {
        return this.selectedProcess.versions;
      }

      return [];
    },
  },
  methods: {
    openSelectionDialog() {
      this.selectCurrentSubprocess();
      this.isCallActivityDialogVisible = true;
    },
    /** filter processes based on current user input in autocomplete component  */
    filterProcesses(item, queryText) {
      return item.name.includes(queryText);
    },
    /**
     * Sets the selected process as the called process
     *
     * @param {Object} process the selected process
     */
    async setProcessAndVersion(process, version) {
      if (process && version) {
        const calledBpmn = await this.$store.getters['processStore/xmlByVersion'](
          process.id,
          version.version,
        );
        await this.modeler
          .get('customModeling')
          .addCallActivityReference(this.selectedElement.id, calledBpmn, process.id);
      } else {
        this.modeler.get('customModeling').removeCallActivityReference(this.selectedElement.id);
      }

      this.isCallActivityDialogVisible = false;
    },

    async filterSelectableSubprocesses() {
      // only processes should be executed and be executed more that once so they are the only valid selection
      this.selectableProcesses = this.$store.getters['processStore/processes'].filter((process) => {
        return process.type === 'process';
      });
    },
    async selectCurrentSubprocess() {
      await this.filterSelectableSubprocesses();
      if (this.currentElementSelectedProcess && this.currentElementSelectedVersion) {
        // preselect the process currently used in the callActivity if in select mode
        this.selectedProcess = this.selectableProcesses.find(
          (process) => process.id === this.currentElementSelectedProcess,
        );
        if (this.selectedProcess) {
          this.selectedVersion = this.selectedProcess.versions.find(
            ({ version }) => version == this.currentElementSelectedVersion,
          );
        }
      } else {
        this.selectedProcess = null;
      }
    },
    openCalledProcessModeler() {
      this.$emit('addTab', {
        processDefinitionsId: this.currentElementSelectedProcess,
        version: this.currentElementSelectedVersion,
      });
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const eventBus = newModeler.get('eventBus');

          eventBus.on('commandStack.element.updateCalledProcess.postExecute', ({ context }) => {
            const { elementId, calledProcessDefinitionsId, calledProcessDefinitionsVersion } =
              context;
            if (elementId === this.selectedElement.id) {
              this.currentElementSelectedProcess = calledProcessDefinitionsId;
              this.currentElementSelectedVersion = parseInt(calledProcessDefinitionsVersion);

              if (this.isCallActivityDialogVisible) {
                this.selectCurrentSubprocess();
              }
            }
          });
        }
      },
      immediate: true,
    },
    selectedElement(newSelection) {
      if (newSelection && newSelection.type === 'bpmn:CallActivity') {
        const { definitionId, version } = getDefinitionsInfoForCallActivity(
          this.modeler,
          newSelection.id,
        );
        this.currentElementSelectedProcess = definitionId;
        this.currentElementSelectedVersion = version;
      } else {
        this.currentElementSelectedProcess = null;
        this.currentElementSelectedVersion = null;
      }
    },
    currentlySelectedInfo() {
      this.selectedProcess = null;
      this.selectCurrentSubprocess();
    },
  },
};
</script>
