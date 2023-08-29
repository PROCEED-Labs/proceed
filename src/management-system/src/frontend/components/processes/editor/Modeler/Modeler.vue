<template>
  <div>
    <v-btn class="loading-message" v-if="loading" :loading="loading" text color="green">
      <template v-slot:loader>
        <span>BPMN Diagram is Loading...</span>
      </template>
    </v-btn>
    <popup :popupData="popupData" @close="resetDialog = true" />
    <div :id="canvasID" class="diagram-container" />
  </div>
</template>
<script>
// the modeler with modeling enabled
import Modeler from 'bpmn-js/lib/Modeler';

// modules for the editor with editing disabled
import NavigatedViewer from 'bpmn-js/dist/bpmn-navigated-viewer.production.min';
import ViewerPassiveModelingExtensionsModule from '@/frontend/helpers/override-modules/viewer-passive-modeling-extensions.js';
import Ids from 'ids';

import proceedModdleExtension from '@proceed/bpmn-helper/customSchema.json';

import CliModule from 'bpmn-js-cli/lib';
import { is } from 'bpmn-js/lib/util/ModelUtil';

import { eventHandler } from '@/frontend/backend-api/index.js';

import CustomRules from '@/frontend/helpers/override-modules/custom-rules.js';
import DisableKeyboardBinding from '@/frontend/helpers/override-modules/custom-keyboard-bindings.js';
import CustomPopUpMenuProvider from '@/frontend/helpers/override-modules/custom-popup-menu-provider.js';
import AutoResizeProvider from '@/frontend/helpers/override-modules/ProceedAutoResizeProvider.js';
import CustomRootElementsBehavior from '@/frontend/helpers/override-modules/custom-root-element-behavior.js';

import CustomModelingModule from '@/frontend/helpers/bpmn-modeler-events/custom-modeling.js';
import CustomBehaviourModule from '@/frontend/helpers/bpmn-modeler-events/custom-behaviour.js';
import ProceedMetaModule from './proceed-meta.js';
import ProceedSelectionModule from './proceed-selection.js';
import ProceedModelingBehaviour from './proceed-modeling-behaviour.js';
import ProceedUserTaskModule from './proceed-user-task.js';
import ProceedConstraintModule from './proceed-constraints.js';

import PlaceholderRenderer from '@/frontend/helpers/bpmn-modeler-events/placeholder-renderer';
import PlaceholderReplacementProvider from '@/frontend/helpers/bpmn-modeler-events/placeholder-provider';

import * as eventDistribution from '@/frontend/helpers/bpmn-modeler-events/event-distribution.js';

import AlertWindow from '@/frontend/components/universal/Alert.vue';

import '@/frontend/helpers/bpmn-modeler-events/placeholder-provider.css';

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
      bpmnEventCallback: null,
      popupData: {
        body: '',
        display: 'none',
        color: 'error',
      },
      loading: false,
    };
  },
  computed: {
    shown() {
      return this.$store.getters['processEditorStore/currentView'] === 'modeler';
    },
    editingDisabled() {
      return this.$store.getters['processEditorStore/editingDisabled'];
    },
    subprocessId() {
      return this.$store.getters['processEditorStore/subprocessId'];
    },
    modeler: {
      get() {
        return this.$store.getters['processEditorStore/modeler'];
      },
      set(val) {
        this.$store.dispatch('processEditorStore/setModeler', val);
      },
    },
    customModeling() {
      if (this.modeler) {
        return this.modeler.get('customModeling');
      }

      return undefined;
    },
    // if this changes the modeler should import the new xml
    forceUpdateXml() {
      return this.$store.getters['processEditorStore/forceUpdateXml'];
    },
    xml() {
      return this.$store.getters['processEditorStore/processXml'];
    },
  },
  methods: {
    /** */
    async setupModeler() {
      // The config values that are used when modeling is enabled or disabled
      const sharedModelerConfig = {
        container: '#' + this.canvasID,
        additionalModules: [
          CliModule,
          CustomModelingModule,
          CustomBehaviourModule,
          ProceedMetaModule,
          ProceedSelectionModule,
          ProceedModelingBehaviour,
          ProceedUserTaskModule,
          ProceedConstraintModule,
          PlaceholderRenderer,
          AutoResizeProvider,
          CustomRootElementsBehavior,
        ],
        moddleExtensions: {
          proceed: proceedModdleExtension,
        },
      };

      // cleanup the old modeler if necessary
      if (this.modeler) {
        this.modeler.destroy();
        this.modeler = null;
      }

      if (!this.editingDisabled) {
        // add config values that should only be used when modeling is enabled
        sharedModelerConfig.keyboard = { bindTo: document };
        sharedModelerConfig.additionalModules.push(
          CustomRules,
          DisableKeyboardBinding,
          CustomPopUpMenuProvider,
          PlaceholderReplacementProvider,
        );

        this.modeler = new Modeler(sharedModelerConfig);
      } else {
        // add config values that should only be used when modeling is disabled
        sharedModelerConfig.additionalModules.push(ViewerPassiveModelingExtensionsModule);

        this.modeler = new NavigatedViewer(sharedModelerConfig);

        this.modeler.get('moddle').ids = new Ids([32, 36, 1]);
      }

      await this.loadXmlIntoModeler();

      eventDistribution.registerModeler(this.modeler);
      eventDistribution.setProcessDefinitionsId(this.process.id);
      eventDistribution.activateDistribution();

      const eventBus = this.modeler.get('eventBus');

      eventBus.on('commandStack.changed', async () => {
        this.saveXmlFromModeler();
      });

      eventBus.on(
        'proceedConstraints.element.changed.constraints',
        ({ element, constraints, dontPropagate }) => {
          if (!dontPropagate) {
            this.$store.dispatch('processStore/updateConstraints', {
              processDefinitionsId: this.process.id,
              elementId: element.id,
              constraints: constraints,
            });
          }
        },
      );

      // handle a user opening a subprocess through the functionality exposed by bpmn-js
      this.modeler.on('root.set', ({ element }) => {
        if (element.type) {
          const subprocessId =
            element.type === 'bpmn:SubProcess' ? element.id.replace(/_plane/g, '') : undefined;

          if (subprocessId !== this.subprocessId) {
            // the subprocess differs from the one currently open
            this.$store.commit('processEditorStore/setSubprocessId', subprocessId);
          }
        }
      });
    },
    /** */
    async saveXmlFromModeler() {
      try {
        const { xml, warnings } = await this.modeler.saveXML({ format: true });
        if (warnings && warnings.length) {
          console.warn(warnings);
        }

        await this.$store.dispatch('processEditorStore/setProcessXml', xml);

        this.$emit('saved');
      } catch (err) {
        console.error(err);
        this.popupData.body = '--> Error in Xml';
        this.popupData.color = 'error';
        this.popupData.display = 'block';
      }
    },
    async loadXmlIntoModeler() {
      try {
        const { warnings } = await this.modeler.importXML(this.xml);
        if (warnings && warnings.length) {
          console.warn(warnings);
        }
        this.oldXml = this.xml;
        this.loading = false;
      } catch (err) {
        this.popupData.body = '--> Error importing BPMN XML';
        this.popupData.color = 'error';
        this.popupData.display = 'block';
        return;
      }
    },
  },
  watch: {
    shown(isShown) {
      if (isShown) {
        this.modeler.get('keyboard').bind(document);
      } else {
        this.modeler.get('keyboard').unbind();
      }
    },
    // Trigger modeler setup if permission to edit the process changes (this will switch between the viewer and the editor)
    async editingDisabled() {
      this.setupModeler();
    },
    async forceUpdateXml(newXml) {
      if (newXml) {
        if (!this.modeler) {
          await this.setupModeler();
        } else {
          await this.loadXmlIntoModeler();
        }

        const elementRegistry = this.modeler.get('elementRegistry');
        const canvas = this.modeler.get('canvas');

        // try to fit the elements into the viewport
        const elements = elementRegistry.filter((element) => {
          return !is(element, 'bpmn:Process');
        });
        if (elements.length > 0) {
          canvas.zoom('fit-viewport', 'auto');
        } else {
          canvas.zoom('fit-viewport', 0, 0);
        }
      }
    },
    process(newProcess) {
      eventDistribution.setProcessDefinitionsId(newProcess ? newProcess.id : null);
    },
    subprocessId(newId) {
      if (this.modeler) {
        // the subprocess that is supposed to be displayed has changed
        const canvas = this.modeler.get('canvas');
        const processElement = canvas.getRootElements().find((el) => el.type === 'bpmn:Process');
        const rootElementId = newId ? `${newId}_plane` : processElement.id;
        canvas.setRootElement(canvas.findRoot(rootElementId));
        canvas.zoom('fit-viewport', 'auto');
      }
    },
  },
  beforeMount() {
    this.loading = true;
  },
  mounted() {
    this.bpmnEventCallback = eventHandler.on(
      'processBPMNEvent',
      ({ processDefinitionsId, type, context }) => {
        if (this.modeler && this.process.id === processDefinitionsId) {
          eventDistribution.applyExternalEvent(type, context);
        }
      },
    );
  },
  beforeDestroy() {
    if (this.modeler) {
      this.modeler.destroy();
      this.modeler = null;
    }
    eventHandler.off('processBPMNEvent', this.bpmnEventCallback);
  },
};
</script>
<style scoped>
.diagram-container {
  width: 100%;
  height: 100%;
}

.loading-message {
  position: absolute;
  bottom: 40%;
  left: 50%;
  right: 50%;
}

.svg-height-fix {
  height: calc(100vh - 168px) !important;
}
</style>
