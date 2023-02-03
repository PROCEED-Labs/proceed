<template>
  <div
    v-show="show"
    class="ide-container"
    :style="{ top: `${this.top}px`, width: '100%', height: `${this.height}px` }"
  >
    <popup :popupData="xmlWarningData" :centered="false" />
    <v-card color="grey lighten-4" class="mb-2" style="border-top: 1px solid black">
      <v-app-bar dense>
        <v-toolbar-title>BPMN XML</v-toolbar-title>
        <v-spacer />
        <v-btn color="primary" @click="saveXml">Save</v-btn>
        <v-btn @click="close">Close</v-btn>
      </v-app-bar>
    </v-card>
    <v-card style="height: calc(100% - 48px)">
      <div style="height: 100%" id="xml-container" @mousedown.stop @keydown="xmlChanged = true" />
    </v-card>
  </div>
</template>
<script>
import AlertWindow from '@/frontend/components/universal/Alert.vue';

import { ensureCorrectProceedNamespace } from '@proceed/bpmn-helper';

import * as monaco from 'monaco-editor';

export default {
  components: {
    popup: AlertWindow,
  },
  props: {
    canvasID: {
      type: String,
      required: true,
    },
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      top: 0,
      height: 0,
      viewer: null,

      xmlChanged: false,
      /** */
      xmlWarningData: {
        body: 'This process is being edited by multiple users, editing the xml might overwrite other users changes',
        display: 'none',
        color: 'error',
      },
    };
  },
  computed: {
    show() {
      return this.$store.getters['processEditorStore/currentView'] === 'xml-viewer';
    },
    editingDisabled() {
      return this.$store.getters['processEditorStore/editingDisabled'];
    },
    xml() {
      return this.$store.getters['processEditorStore/processXml'];
    },
    forceUpdateXml() {
      return this.$store.getters['processEditorStore/forceUpdateXml'];
    },
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
  },
  methods: {
    close() {
      this.$store.commit('processEditorStore/setCurrentView', 'modeler');
    },
    setup() {
      this.viewer = monaco.editor.create(document.getElementById('xml-container'), {
        language: 'xml',
        theme: 'vs-light',
        glyphMargin: true,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        minimap: {
          enabled: false,
        },
        wordWrap: 'on',
        wrappingStrategy: 'advanced',
        wrappingIndent: 'same',
      });
      this.viewer.setValue(this.xml);
      if (!process.env.IS_ELECTRON) {
        const dbs = document.getElementById(this.canvasID).childNodes[0];
        const djs = dbs.getElementsByClassName('djs-container')[0];
        const svg = djs.getElementsByTagName('svg')[0];
        svg.classList.add('svg-height-fix');
      }
    },
    /** */
    async saveXml() {
      if (!this.editingDisabled && this.xmlChanged) {
        let xml = this.viewer.getValue();
        // prevent problems if the user somehow changed the proceed namespace URI
        xml = ensureCorrectProceedNamespace(xml);

        await this.$store.dispatch('processEditorStore/setProcessXml', xml);
        this.$store.commit('processEditorStore/setForceUpdateXml', xml);

        this.$store.dispatch('processStore/update', {
          id: this.process.id,
          changes: {},
          bpmn: xml,
        });
      }
    },
  },
  watch: {
    modeler: {
      handler(currentModeler) {
        if (currentModeler) {
          if (!this.viewer) {
            this.setup();
          }
        }
      },
      immediate: true,
    },
    show(shouldShow) {
      if (shouldShow) {
        this.viewer.setValue(this.xml);
        this.xmlChanged = false;

        // if there are other users editing the process make sure to warn that their changes may be overriden on save
        if (this.process.inEditingBy && this.process.inEditingBy.length > 1) {
          this.xmlWarningData.display = 'block';
        }

        const canvas = document.getElementById(this.canvasID).getBoundingClientRect();
        this.top = canvas.top;
        this.height = canvas.height;
      }
    },
    xml(newXml) {
      if (this.viewer && !this.show) {
        this.viewer.setValue(newXml);
      }
    },
    forceUpdateXml() {
      if (this.viewer) {
        this.viewer.setValue(this.xml);
      }
    },
  },
  beforeDestroy() {
    if (this.viewer) {
      this.viewer.dispose();
      this.viewer = null;
    }
  },
};
</script>
<style scoped>
.ide-container {
  position: absolute;
  border: 1px solid lightgray;
  z-index: 999;
  overflow: hidden;
}
</style>
