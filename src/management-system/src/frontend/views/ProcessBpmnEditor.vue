<template>
  <div class="modeler-container">
    <tab-bar ref="tab-bar" @returnToOverview="returnToOverview" @changedTab="resetCloseTimeout" />
    <v-btn v-if="!process" class="loading-message" :loading="true" text color="green">
      <template v-slot:loader>
        <span>Pulling requested process from server...</span>
      </template>
    </v-btn>
    <div
      v-else
      class="main-modeler"
      :style="{
        '--non-selectable-colors': nonExecutableColors,
      }"
    >
      <toolbar
        :process="process"
        :name="name"
        :hideUnsupportedElements="areNonExecutableElementsHidden"
        :showSaveMessage="isSaveMessageVisible"
        :isPropertiesPanelVisible="isPropertiesPanelVisible"
        @hideUnsupportedElements="hideNonExecutableElements"
        @showUnsupportedElements="showNonExecutableElements"
        @addTab="addTab"
        @showPropertiesPanel="isPropertiesPanelVisible = $event"
        @returnToOverview="returnToOverview"
      ></toolbar>
      <PropertiesPanel
        v-if="selectedElement"
        :canvasID="canvasID"
        :ref="propertiesID"
        :element="selectedElement"
        :processType="process.type"
        :process="process"
        @close="isPropertiesPanelVisible = false"
        :style="{
          display: isPropertiesPanelVisible ? 'block' : 'none',
        }"
      />
      <modeler class="bpmn-modeler" :canvasID="canvasID" :process="process" @saved="onSave" />
      <lost-connection-dialog :process="process" />
      <xml-viewer :canvasID="canvasID" :process="process" />
      <html-editor :canvasID="canvasID" :process="process"></html-editor>
      <ScriptingIde :canvasID="canvasID" :process-definitions-id="process.id" :key="process.id" />
      <variable-toolbar :process="process" @showSaveMessage="showSaveMessage" />

      <!-- TODO: see if style still works-->
      <confirmation
        id="revertDialog"
        title="revert your changes? This action cannot be undone"
        text="Do you want to continue?"
        :show="resetDialog"
        maxWidth="390px"
        @cancel="resetDialog = false"
        @continue="reset"
      />

      <confirmation
        title="stop editing this instance?"
        text="You are the only currently active editor of this adaptation. If you don't expect any futher editing being done you might want to remove the adaptation to free up space in the backend. Otherwise you can also choose to keep the adaptation in an unfinished state so editing can be continued later on."
        maxWidth="390px"
        :show="showAdaptationRemovalDialog"
      >
        <template #actions>
          <v-btn @click="showAdaptationRemovalDialog = false"> Cancel </v-btn>
          <v-btn color="success" @click="routeChangeCallback()"> Keep & Leave </v-btn>
          <v-btn color="error" @click="removeAdaptationAndLeave"> Remove & Leave </v-btn>
        </template>
      </confirmation>
    </div>
  </div>
</template>

<script>
import Modeler from '@/frontend/components/processes/editor/Modeler/Modeler.vue';
import XmlViewer from '@/frontend/components/processes/editor/XmlViewer.vue';
import ScriptingIde from '@/frontend/components/scripting-ide/ScriptingIde.vue';
import HtmlEditor from '@/frontend/components/processes/editor/HtmlEditor.vue';

import TabBar from '@/frontend/components/processes/editor/TabBar.vue';
import Toolbar from '@/frontend/components/processes/editor/MainEditorToolbar.vue';
import PropertiesPanel from '@/frontend/components/processes/editor/PropertiesPanel/PropertiesPanel.vue';
import VariableToolbar from '@/frontend/components/processes/editor/VariableToolbar.vue';

import Confirmation from '@/frontend/components/universal/Confirmation.vue';
import LostConnectionDialog from '@/frontend/components/processes/editor/LostConnectionDialog.vue';

import { v4 } from 'uuid';
import { subject } from '@casl/ability';

import hiddenElements from '@/frontend/assets/styles/hidden-non-executable-element.lazy.css';

/**
 * @module views
 */
/**
 * Main Component for Manipulating the BPMN processes
 *
 * @memberof module:views
 * @module Vue:ProcessBpmnEditor
 *
 * @vue-computed isPropertiesPanelVisible
 * @vue-computed xml
 * @vue-computed name
 * @vue-computed process
 * @vue-computed selectedElementId
 */
export default {
  name: 'process-bpmn-editor',
  components: {
    TabBar,
    Toolbar,
    ScriptingIde,
    LostConnectionDialog,
    Confirmation,
    PropertiesPanel,
    XmlViewer,
    HtmlEditor,
    Modeler,
    VariableToolbar,
  },
  computed: {
    processDefinitionsId() {
      return this.$store.getters['processEditorStore/id'];
    },
    subprocessId() {
      return this.$store.getters['processEditorStore/subprocessId'];
    },
    instanceId() {
      return this.$store.getters['processEditorStore/instanceId'];
    },
    version() {
      return this.$store.getters['processEditorStore/version'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    isPropertiesPanelVisible: {
      get() {
        return this.$store.getters['userPreferencesStore/getPropertiesPanelVisibility'];
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setPropertiesPanelVisibility', newValue);
      },
    },
    process() {
      let process = this.$store.getters['processStore/processById'](this.processDefinitionsId);

      if (!process) {
        return null;
      }

      process = {
        ...process,
        subprocessId: this.subprocessId,
        version: this.version,
        instanceId: this.instanceId,
      };

      const type = process.type[0].toUpperCase() + process.type.slice(1);
      subject(type, process);

      return process;
    },
    name() {
      let name = this.process.subprocessId;

      if (!name && this.process) {
        name = this.process.name;
      }

      // prevent error that occurs when name isn't already set in processEditorStore
      return name ? name : 'Loading...';
    },
    nonExecutableColors() {
      const config = this.$store.getters['userPreferencesStore/getUserConfig'];

      if (!config.highlightNonExecutableElements) {
        return 'black';
      }

      return config.nonExecutableElementsColor;
    },
    editingDisabled() {
      return this.$store.getters['processEditorStore/editingDisabled'];
    },
  },
  data() {
    return {
      /** */
      canvasID: 'canvas_' + v4(),
      /** */
      propertiesID: 'properties_' + v4(),

      /** */
      timeout: null,
      /** */
      resetDialog: false,
      /** */
      confirm: false,
      /** */
      isSaveMessageVisible: false,
      /** */
      areNonExecutableElementsHidden: false,

      /** */
      nonExecutableElementsExplanation:
        'The so called non-executable elements can be used when creating a bpmn diagram, but cannot be executed on the bpmn engine',

      showAdaptationRemovalDialog: false,
      routeChangeCallback: null,
      adaptationWasSubmitted: false,
    };
  },
  methods: {
    /** */
    hideNonExecutableElements() {
      hiddenElements.use();
      this.areNonExecutableElementsHidden = true;
    },
    /** */
    showNonExecutableElements() {
      hiddenElements.unuse();
      this.areNonExecutableElementsHidden = false;
    },
    /** */
    async reset() {
      await this.saveXml(this.oldXml);
      this.resetDialog = false;
    },

    /** */
    async saveXml(xml) {
      await this.$store.dispatch('processEditorStore/setProcessXml', xml);
    },
    onSave() {
      this.showSaveMessage();
      this.resetCloseTimeout();
    },
    /** */
    showSaveMessage() {
      this.isSaveMessageVisible = true;
      setTimeout(() => {
        this.isSaveMessageVisible = false;
      }, 3000);
    },
    /** */
    resetCloseTimeout() {
      if (!process.env.IS_ELECTRON) {
        const config = this.$store.getters['configStore/config'];

        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
          this.returnToOverview();
          this.$store.commit('warningStore/setWarning', true);
        }, config.closeOpenEditorsInMs || 300000);
      }
    },
    addTab({ processDefinitionsId, subprocessId, version, instanceId }) {
      this.$refs['tab-bar'].addTab(processDefinitionsId, subprocessId, version, instanceId);
    },
    returnToOverview() {
      if (this.$router.currentRoute.name === 'edit-project-bpmn') {
        const projectStatusPath = this.$router.currentRoute.path.replace('bpmn', 'status');
        this.$router.push({ path: projectStatusPath });
      } else {
        let [targetPath] = this.$router.currentRoute.path.split('/bpmn', 1);
        if (this.instanceId) {
          // go back to the deployment overview
          [targetPath] = targetPath.split('/process');
          targetPath += '/executions';
          // this.process might be false when the deployment was removed resulting in the adaptation process being removed (=> there is no deployment to return to)
          if (this.process) {
            this.adaptationWasSubmitted = true;
            targetPath += `/${this.processDefinitionsId.split('-instance')[0]}`;
            // this query should ensure that the instance we just changed is displayed after we changed the view
            targetPath += `?instance=${this.instanceId}`;
            // remove the instance process now that the change is applied
            setTimeout(() => {
              this.$store.dispatch('processStore/remove', { id: this.processDefinitionsId });
            }, 10);
          }
        }
        this.$router.push({ path: targetPath });
      }
    },
    async removeAdaptationAndLeave() {
      const id = this.processDefinitionsId;
      // change to the user selected route
      this.routeChangeCallback();
      setTimeout(() => {
        // remove the process after the editor was torn down to avoid problems with requests referencing the removed process (e.g. stopping observing its editing)
        this.$store.dispatch('processStore/remove', { id: this.processDefinitionsId });
      }, 10);
    },
  },
  async mounted() {
    this.$store.dispatch('processEditorStore/init');

    document.addEventListener('mousemove', this.resetCloseTimeout, { passive: true });
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.resetCloseTimeout, { passive: true });
    clearTimeout(this.timeout);
    this.$store.dispatch('processEditorStore/reset');
  },
  beforeRouteLeave(to, from, next) {
    // provide the user with a way to cleanup unwanted instance adaptation processes if they are not needed anymore
    if (
      this.process &&
      this.instanceId &&
      this.$router.currentRoute.name !== 'edit-project-bpmn' &&
      this.process.inEditingBy.length === 1 &&
      !this.adaptationWasSubmitted
    ) {
      this.routeChangeCallback = next;
      this.showAdaptationRemovalDialog = true;
    } else {
      next();
    }
  },
  watch: {
    // make sure to remember the original xml of a process when we start looking at a new one for reset purposes
    async processDefinitionsId(newId) {
      if (newId) {
        this.oldXml = this.$store.getters['processEditorStore/processXml'];
      }
    },
  },
};
</script>

<style lang="scss">
/* https://sass-lang.com/documentation/syntax#scss */

@import '../assets/styles/non-executable-elements-controlls.css';
.loading-message {
  position: absolute;
  bottom: 50%;
  left: 50%;
  right: 50%;
}

.select-user-icon:before {
  content: '\F004';
  font: normal normal normal 20px 'Material Design Icons';
  text-decoration: inherit;
  /*--adjust as necessary--*/
  color: #000;
}

.append-users-or-roles {
  visibility: visible !important;
}

.bpmn-icon-sequential-mi-marker::after {
  position: relative;
  top: 3.25px;
  left: 3px;
  display: inline-block;
  content: ' ';
  width: 14px;
  height: 14px;
  border-radius: 7.5px;
}

.bpmn-icon-sequential-mi-marker.connected::after {
  background-color: #0a0;
}

.bpmn-icon-sequential-mi-marker.disconnected::after {
  background-color: #c22;
}

#revertDialog {
  position: fixed;
  top: 50vh;
  z-index: 998;
  left: 50%;
}

.modeler-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-modeler {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.bpmn-modeler {
  flex-grow: 1;
}

.properties-panel {
  z-index: 1;
  position: absolute;
  overflow-y: scroll;
  top: 180px;
  right: 10px;
}
.properties-toggle {
  z-index: 1;
  position: absolute;
  top: 140px;
  right: 10px;
}

.djs-palette {
  top: 112px;
}
</style>
