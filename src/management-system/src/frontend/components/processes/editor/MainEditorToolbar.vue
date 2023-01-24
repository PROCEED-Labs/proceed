<template>
  <hovering-toolbar v-show="currentView === 'modeler'">
    <toolbar-group>
      <v-toolbar-title>
        <span v-if="name.length < 20">
          {{ name }}
        </span>
        <v-tooltip v-else bottom>
          <template v-slot:activator="{ on }">
            <span v-on="on">{{ name.substr(0, 20) }}...</span>
          </template>
          <span> {{ name }}</span>
        </v-tooltip>
      </v-toolbar-title>
      <div v-if="process.type === 'process' || process.type === 'process-instance'">
        <v-divider vertical inset />
        <toolbar-menu
          v-model="selectedVersion"
          :items="process.versions"
          itemTextattribute="name"
          itemHintAttribute="description"
          noSelectionText="Latest Version"
        >
          <template v-if="!process.versions.length" #open-hint>No versions available</template>
          <template v-else #open-hint>Select Version</template>
          <template #list-prepend>
            <v-list-item
              :input-value="!selectedVersion"
              style="color: darkgray; font-style: italic"
              @click="selectedVersion = { version: undefined }"
              >(Latest Version)</v-list-item
            >
          </template>
        </toolbar-menu>
      </div>
    </toolbar-group>
    <v-spacer />
    <v-btn
      v-if="showSaveMessage && $can('update', process)"
      text
      small
      color="green"
      style="align-self: center"
    >
      Changes saved
      <v-icon right small>mdi-check</v-icon>
    </v-btn>
    <conditional-flow-options :process="process" />
    <toolbar-group v-if="showSelectedOptions && $can('update', process)">
      <call-activity-handling :process="process" @addTab="$emit('addTab', $event)" />
      <tooltip-button
        v-if="selectedElement.type === 'bpmn:ScriptTask'"
        @click="currentView = 'script-editor'"
      >
        <template #tooltip-text>Edit Script</template>
        mdi-script-text-outline
      </tooltip-button>
      <tooltip-button v-if="selectedElement.type === 'bpmn:UserTask'" @click="editUserTask">
        <template #tooltip-text>Edit User Task Form</template>
        mdi-form-select
      </tooltip-button>
      <timer-handling />
      <tooltip-button
        v-if="
          selectedElement.type === 'bpmn:SubProcess' &&
          (selectedElement.collapsed || selectedElement.isExpanded === false)
        "
        @click="openSubprocessModeler"
      >
        <template #tooltip-text>Edit SubProcess</template>
        mdi-open-in-new
      </tooltip-button>
      <constraint-handling :process="process" />
    </toolbar-group>
    <toolbar-group>
      <tooltip-button @click="currentView = 'xml-viewer'">
        <template #tooltip-text>Show XML</template>
        mdi-xml
      </tooltip-button>
      <process-export :process="process" />
      <tooltip-button v-if="!hideUnsupportedElements" @click="$emit('hideUnsupportedElements')">
        <template #tooltip-text>Hide non-executable elements</template>
        mdi-eye-outline
      </tooltip-button>
      <tooltip-button v-else @click="$emit('showUnsupportedElements')">
        <template #tooltip-text>Show non-executable elements</template>
        mdi-eye-off-outline
      </tooltip-button>
      <tooltip-button v-if="isPropertiesPanelVisible" @click="$emit('showPropertiesPanel', false)">
        <template #tooltip-text>Close Properties Panel</template>
        mdi-cog-outline
      </tooltip-button>
      <tooltip-button v-else @click="$emit('showPropertiesPanel', true)">
        <template #tooltip-text>Open Properties Panel</template>
        mdi-cog-off-outline
      </tooltip-button>
      <tooltip-button v-if="!isElectron" :disabled="!isShared" @click="clipUrl">
        <template #tooltip-text>Share</template>
        mdi-share-outline
      </tooltip-button>
      <version-handling :process="process" />
    </toolbar-group>
    <toolbar-group v-if="isElectron && modeler">
      <tooltip-button @click="modeler.get('commandStack').undo()">
        <template #tooltip-text>Undo</template>
        mdi-undo
      </tooltip-button>
      <tooltip-button @click="modeler.get('commandStack').redo()">
        <template #tooltip-text>Redo</template>
        mdi-redo
      </tooltip-button>
    </toolbar-group>
    <instance-editing
      @returnToOverview="$emit('returnToOverview')"
      v-if="instanceEditingMode"
      :process="process"
    />
  </hovering-toolbar>
</template>
<script>
import HoveringToolbar from '@/frontend/components/universal/toolbar/HoveringToolbar.vue';
import ToolbarGroup from '@/frontend/components/universal/toolbar/ToolbarGroup.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

import ToolbarMenu from '@/frontend/components/universal/toolbar/ToolbarMenu.vue';
import ConditionalFlowOptions from '@/frontend/components/processes/editor/ConditionalFlowOptions.vue';
import InstanceEditing from '@/frontend/components/processes/editor/InstanceEditing.vue';
import VersionHandling from '@/frontend/components/processes/editor/VersionHandling.vue';
import TimerHandling from '@/frontend/components/processes/editor/TimerHandling.vue';
import CallActivityHandling from '@/frontend/components/processes/editor/CallActivityHandling.vue';
import ConstraintHandling from '@/frontend/components/processes/editor/ConstraintHandling.vue';
import ProcessExport from '@/frontend/components/processes/editor/ProcessExport.vue';

export default {
  name: 'main-editor-toolbar',
  components: {
    HoveringToolbar,
    ToolbarGroup,
    TooltipButton,
    ToolbarMenu,
    ConditionalFlowOptions,
    InstanceEditing,
    VersionHandling,
    TimerHandling,
    CallActivityHandling,
    ConstraintHandling,
    ProcessExport,
  },
  props: {
    process: {
      type: Object,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    hideUnsupportedElements: {
      type: Boolean,
      required: true,
    },
    showSaveMessage: {
      type: Boolean,
      required: false,
    },
    isPropertiesPanelVisible: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      displayTypeSelection: 0,
    };
  },
  computed: {
    instanceEditingMode() {
      return !!this.process.instanceId;
    },
    currentView: {
      get() {
        return this.$store.getters['processEditorStore/currentView'];
      },
      set(view) {
        this.$store.commit('processEditorStore/setCurrentView', view);
      },
    },
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    isElectron() {
      return process.env.IS_ELECTRON;
    },
    selectedVersion: {
      get() {
        const selected = this.$store.getters['processEditorStore/version'];
        return this.process.versions.find((versionInfo) => versionInfo.version === selected);
      },
      set({ version }) {
        this.$emit('addTab', {
          processDefinitionsId: this.process.id,
          version,
          instanceId: this.process.instanceId,
        });
      },
    },
    isShared() {
      return this.process ? this.process.shared : false;
    },
    showSelectedOptions() {
      return this.selectedElement && this.selectedElement.type !== 'bpmn:SequenceFlow';
    },
  },
  methods: {
    clipUrl() {
      // Hacky workaround to copy the current url into the clipboard: https://stackoverflow.com/a/49618964
      const dummyInput = document.createElement('input');
      document.body.appendChild(dummyInput);
      dummyInput.value = window.location.href;
      dummyInput.select();
      dummyInput.setSelectionRange(0, 99999);
      document.execCommand('copy');
      document.body.removeChild(dummyInput);
    },
    openSubprocessModeler() {
      this.$emit('addTab', {
        processDefinitionsId: this.process.id,
        subprocessId: this.selectedElement.id,
        version: this.selectedVersion ? this.selectedVersion.version : undefined,
        instanceId: this.process.instanceId,
      });
    },
    editUserTask() {
      if (
        this.selectedElement &&
        this.selectedElement.businessObject.implementation === '5thIndustry'
      ) {
        const rootMetaData = this.modeler.get('proceedMeta').getRootMetaData();
        const planId = rootMetaData['_5i-Inspection-Plan-ID'];
        const templateId = rootMetaData['_5i-Inspection-Plan-Template-ID'];
        const applicationAddress = rootMetaData['_5i-Application-Address'];
        if (applicationAddress) {
          if (planId) {
            window.open(`${applicationAddress}/plans/edit/${planId}`);
          } else if (templateId) {
            window.open(`${applicationAddress}/planTemplates/edit/${templateId}`);
          }
        }
      } else {
        this.currentView = 'html-editor';
      }
    },
  },
};
</script>
<style scoped>
.v-toolbar__content .v-btn {
  padding: 0;
  min-width: 48px;
}
.v-divider--vertical.v-divider--inset {
  margin-left: 8px;
  margin-right: 8px;
}
</style>
