<template>
  <Confirmation
    customTitle
    :title="`Subprocesses for ${process ? process.name : ''}`"
    noButtons
    :show="show"
    maxWidth="800px"
    @cancel="$emit('cancel')"
  >
    <v-row>
      <v-col cols="4" sm="4" md="4">
        <SubprocessesTreeView
          style="background-color: white"
          :process="process"
          :subprocesses="subprocesses"
          :isDynamicSelection="true"
          @active="openItem"
        />
      </v-col>
      <v-col cols="8" sm="8" md="8">
        <div v-if="selectedProcess">
          <h4 v-if="selectedNodeTitle">{{ selectedNodeTitle }}</h4>
          <br v-if="selectedNodeTitle" />
          <BpmnPreview
            :process="selectedProcess"
            :version="selectedVersion"
            :subprocessId="selectedSubprocessId"
            @editBpmn="$emit('editBpmn', { process: selectedProcess })"
          ></BpmnPreview>
        </div>
        <div v-else>
          <h4>There is no Bpmn Diagram. To see please do the following:</h4>
          <ul>
            <li>Select any item from tree placed at left side</li>
            <li>After that you will see bpmn diagram</li>
            <li>Clicking bpmn diagram will take you to editor</li>
          </ul>
        </div>
      </v-col>
    </v-row>
  </Confirmation>
</template>

<script>
import Confirmation from '@/frontend/components/universal/Confirmation.vue';
import SubprocessesTreeView from '@/frontend/components/processes/subprocesses/SubprocessesTreeview.vue';
import BpmnPreview from '@/frontend/components/bpmn/BpmnPreview.vue';

import { getProcessHierarchy } from '@/shared-frontend-backend/helpers/process-hierarchy.js';

export default {
  components: {
    Confirmation,
    SubprocessesTreeView,
    BpmnPreview,
  },
  props: {
    process: {
      type: Object,
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  data: () => ({
    selectedProcess: null,
    selectedVersion: null,
    selectedNodeTitle: '',
    unnamedLabel: 'Unnamed',
    subprocesses: [],
    selectedSubprocess: null,
  }),
  computed: {
    selectedSubprocessId() {
      if (this.selectedSubprocess) {
        return this.selectedSubprocess.id;
      }

      return null;
    },
  },
  methods: {
    async openItem(item) {
      //Setting selected node title
      this.selectedNodeTitle = item.name || this.unnamedLabel;

      //If CallActivity is True then Get XML esMoFrom Store else create new xml for sub processes
      if (item.isCallActivity) {
        //Creating Process Object with only id element to emit to parent component when bpmn preview is @clicked
        this.selectedProcess = { id: item.calledProcessId };
        this.selectedVersion = { version: item.version };
        this.selectedSubprocess = null;

        //Setting selected node type
        this.selectedNodeTitle = `Global Process ${this.selectedNodeTitle}`;
      } else {
        this.selectedProcess = this.process;
        this.selectedVersion = null;
        this.selectedNodeTitle = '';
        // we need to wait in the case that we want to switch to another process and select a subprocess at the same time
        // (the diagram of the other process has to be loaded before we can select the subprocess)
        setTimeout(() => {
          this.selectedSubprocess = item.isSubprocess ? item : null;
        }, 10);
      }
    },
  },
  watch: {
    process: {
      async handler(newProcess) {
        this.selectedProcess = this.process;
        this.selectedNodeTitle = '';

        // recalculate subprocesses when the process changes
        if (newProcess) {
          const bpmn = await this.$store.getters['processStore/xmlById'](newProcess.id);
          this.subprocesses = await getProcessHierarchy(bpmn);
        }
      },
      immediate: true,
    },
  },
};
</script>

<style scoped>
.v-card__text,
.v-card__title {
  word-break: normal;
}
</style>
