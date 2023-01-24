<template>
  <v-menu
    v-if="process"
    content-class="tab-menu"
    open-on-hover
    offset-y
    bottom
    tile
    :close-on-content-click="false"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-tab v-bind="attrs" v-on="on">
        <div class="tab-title">
          <div
            :class="{
              'text-subtitle-1': true,
              'grey--text': false,
            }"
          >
            <p v-if="subprocessId" class="ma-0 pa-0 caption font-weight-bold">Subprocess</p>
            <p v-if="versionInfo" class="ma-0 pa-0 caption font-weight-bold">
              {{ versionInfo.name }}
            </p>

            <span v-if="title.length < 20">
              {{ title }}
            </span>
            <v-tooltip v-else bottom>
              <template v-slot:activator="{ on }">
                <span v-on="on">{{ title.substr(0, 20) }}...</span>
              </template>
              <span> {{ title }}</span>
            </v-tooltip>
          </div>
        </div>
        <v-btn icon x-small class="ml-3" @click="$emit('deleteTab')"
          ><v-icon>mdi-close</v-icon>
        </v-btn>
      </v-tab>
    </template>
    <SubprocessesTreeView
      style="background-color: white"
      :process="process"
      :subprocesses="subprocesses"
      :isDynamicSelection="false"
      :selectedSubprocessId="subprocessId"
      @click="openItem"
    />
  </v-menu>
</template>

<script>
import SubprocessesTreeView from '@/frontend/components/processes/subprocesses/SubprocessesTreeview.vue';

import { getProcessHierarchy } from '@/shared-frontend-backend/helpers/process-hierarchy.js';

export default {
  name: 'ProcessTab',
  components: { SubprocessesTreeView },
  props: {
    processDefinitionsId: {
      type: String,
      required: true,
      validator: (value) => value.startsWith('_') || value.startsWith('Project_'),
    },
    subprocessId: {
      type: String,
      required: false,
    },
    version: Number,
  },
  data() {
    return {
      subprocesses: [],
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    process() {
      return this.$store.getters['processStore/processById'](this.processDefinitionsId);
    },
    subprocess() {
      if (this.subprocessId) {
        return this.findSubprocess(this.subprocesses, this.subprocessId);
      }
      return null;
    },
    title() {
      return this.subprocess
        ? this.subprocess.name || this.subprocess.elementId
        : this.process.name;
    },
    versionInfo() {
      return this.process.versions.find((v) => v.version === this.version);
    },
  },
  methods: {
    findSubprocess(subprocesses, subprocessId) {
      if (subprocesses) {
        for (const subprocess of subprocesses) {
          if (subprocess.elementId === subprocessId) {
            return subprocess;
          }

          const foundSubprocess = this.findSubprocess(subprocess.subprocesses, subprocessId);
          if (foundSubprocess) {
            return foundSubprocess;
          }
        }
      }
      return null;
    },
    openItem(item) {
      if (item.id === this.process.id) {
        // open main process
        this.$emit('addTab', {
          processDefinitionsId: item.id,
        });
      } else if (item.hasOwnProperty('isExpanded')) {
        // open subprocess
        this.$emit('addTab', {
          processDefinitionsId: this.process.id,
          subprocessId: item.elementId,
        });
      } else if (item.isCallActivity) {
        // open call activity
        this.$emit('addTab', { processDefinitionsId: item.calledProcessId, version: item.version });
      }
    },
  },
  watch: {
    process: {
      async handler(newProcess, oldProcess) {
        // recalculate subprocesses when the process changes
        if (newProcess && (!oldProcess || oldProcess.id !== newProcess.id)) {
          const bpmn = await this.$store.getters['processStore/xmlById'](newProcess.id);
          this.subprocesses = await getProcessHierarchy(bpmn);
        }
      },
      immediate: true,
    },
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          // recalculate the subprocess info when subprocess types are changed in the modeler
          newModeler.get('eventBus').on('commandStack.postExecuted', ({ command, context }) => {
            const subprocessDeleted =
              command === 'shape.delete' &&
              (context.shape.type === 'bpmn:SubProcess' ||
                context.shape.type === 'bpmn:CallActivity');

            const subprocessAdded =
              command === 'shape.create' && context.shape.type === 'bpmn:SubProcess';

            const subprocessLabelChange =
              command === 'element.updateLabel' &&
              (context.element.type === 'bpmn:SubProcess' ||
                context.element.type === 'bpmn:CallActivity');

            const callActivityChange = command === 'element.updateCalledProcess';

            if (
              subprocessDeleted ||
              subprocessAdded ||
              subprocessLabelChange ||
              callActivityChange
            ) {
              // let the store update before getting the xml (can't use the xml from the modeler since the current xml might be a subprocess)
              setTimeout(async () => {
                const bpmn = await this.$store.getters['processEditorStore/processXml'];
                this.subprocesses = await getProcessHierarchy(bpmn);
              }, 1000);
            }
          });
        }
      },
      immediate: true,
    },
  },
};
</script>
