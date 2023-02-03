<template>
  <div ref="canvas" :id="canvasID" class="vue-bpmn-diagram-container"></div>
</template>

<script>
import uuid from 'uuid';
import Viewer from 'bpmn-js/dist/bpmn-viewer.production.min';
import NavigatedViewer from 'bpmn-js/dist/bpmn-navigated-viewer.production.min';
import Modeler from 'bpmn-js/dist/bpmn-modeler.production.min';
import proceedModdleExtension from '@proceed/bpmn-helper/customSchema.json';

import PlaceholderRenderer from '@/frontend/helpers/bpmn-modeler-events/placeholder-renderer';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';

export default {
  name: 'BpmnJsWrapper',
  props: {
    xml: {
      type: String,
      required: false,
    },
    viewerMode: {
      type: String,
      required: false,
      default: 'viewer',
      validator: function (value) {
        // The value must match one of these strings
        return ['viewer', 'navigated-viewer', 'modeler'].includes(value);
      },
    },
    flowElementsStyling: {
      type: Array,
      required: false,
    },
    subprocessId: {
      type: String,
      default: '',
    },
    // allow to hide the bpmn-js overlays for subprocess navigation for cases like process previews
    showDrilldownOverlay: {
      type: Boolean,
      default: false,
    },
    showSubprocessBreadcrumbs: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      viewer: null,
      canvasID: 'canvas_' + uuid.v4(),
      appliedStyling: [],
    };
  },
  watch: {
    xml() {
      if (!this.viewer) this.setupViewer();
      this.appliedStyling = [];
      this.loadXML();
    },
    flowElementsStyling() {
      this.removeCurrentColors();
      this.applyColors();
    },
    subprocessId() {
      if (this.viewer) {
        const canvas = this.viewer.get('canvas');

        let rootEl;
        if (this.subprocessId) {
          rootEl = canvas.findRoot(`${this.subprocessId}_plane`);
        } else {
          rootEl = canvas.getRootElements().find((el) => el.type === 'bpmn:Process');
        }

        if (rootEl) {
          canvas.setRootElement(rootEl);
          canvas.zoom('fit-viewport', 'auto');
        }
      }
    },
    showDrilldownOverlay() {
      this.toggleDrillDownVisibility();
    },
    showSubprocessBreadcrumbs() {
      this.toggleSubprocessBreadcrumbVisibility();
    },
  },
  methods: {
    async removeCurrentColors() {
      if (this.viewer) {
        const canvas = this.viewer.get('canvas');
        this.appliedStyling.forEach(({ elementId, color }) => {
          canvas.removeMarker(elementId, color);
        });
        this.appliedStyling = [];
      }
    },
    async applyColors() {
      if (this.flowElementsStyling) {
        const canvas = this.viewer.get('canvas');
        for (const elementStyle of this.flowElementsStyling) {
          this.appliedStyling.push(elementStyle);
          canvas.addMarker(elementStyle.elementId, elementStyle.color);
        }
      }
    },
    async setupViewer() {
      const viewerCreationOptions = {
        container: '#' + this.canvasID,
        moddleExtensions: {
          proceed: proceedModdleExtension,
        },
        additionalModules: [PlaceholderRenderer],
      };

      switch (this.viewerMode) {
        case 'navigated-viewer':
          this.viewer = new NavigatedViewer(viewerCreationOptions);
          break;
        case 'modeler':
          this.viewer = new Modeler(viewerCreationOptions);
          break;
        default:
          this.viewer = new Viewer(viewerCreationOptions);
          break;
      }

      const eventBus = this.viewer.get('eventBus');

      const eventsToEmit = ['element.click', 'element.hover', 'element.out', 'element.dblclick'];

      eventsToEmit.forEach((eventToEmit) => {
        eventBus.on(eventToEmit, (event) => {
          // replace '.' with ':' because vue events don't support them
          this.$emit(eventToEmit.replace('.', ':'), event);
        });
      });

      // expose the viewer to parent component
      this.$emit('newViewer', this.viewer);
    },
    async loadXML() {
      if (typeof this.xml !== 'string' || this.xml.length === 0) {
        this.viewer.destroy();
        this.viewer = null;
        return;
      }

      let xml = this.xml;

      try {
        const { warnings } = await this.viewer.importXML(xml);
        if (warnings && warnings.length) {
          console.warn(warnings);
        }

        // try to show the selected subprocess after loading the bpmn
        if (this.subprocessId) {
          const canvas = this.viewer.get('canvas');
          const subprocessPlane = canvas.findRoot(`${this.subprocessId}_plane`);
          if (subprocessPlane) {
            canvas.setRootElement(subprocessPlane);
          }
        }

        this.viewer.get('canvas').zoom('fit-viewport', 'auto');
        this.applyColors();
      } catch (err) {
        // Only display error, if its not due to missing canvas to display the imported xml after beforeDestroy hook
        if (this.$refs.canvas) {
          console.error(err);
        }
      }

      this.$emit('xml:changed');
    },
    /**
     * Will toggle if the bpmn-js overlay to drill down into a subprocess is shown (should be hidden in small process overviews)
     */
    toggleDrillDownVisibility() {
      const canvasEl = document.getElementById(this.canvasID);
      if (this.showDrilldownOverlay) {
        canvasEl.classList.remove('bpmn-js-wrapper-hide-drilldown-overlay');
      } else {
        canvasEl.classList.add('bpmn-js-wrapper-hide-drilldown-overlay');
      }
    },
    /**
     * Will toggle if the bpmn-js breadcrumbs that display the position in the subprocess hierarchy are shown (should be hidden in small process overviews)
     */
    toggleSubprocessBreadcrumbVisibility() {
      const canvasEl = document.getElementById(this.canvasID);
      if (this.showSubprocessBreadcrumbs) {
        canvasEl.classList.remove('bpmn-js-wrapper-hide-subprocess-breadcrumbs');
      } else {
        canvasEl.classList.add('bpmn-js-wrapper-hide-subprocess-breadcrumbs');
      }
    },
  },
  beforeDestroy() {
    if (this.viewer) {
      this.viewer.destroy();
    }
  },
  mounted() {
    this.setupViewer();
    this.loadXML();
    this.toggleDrillDownVisibility();
    this.toggleSubprocessBreadcrumbVisibility();
  },
};
</script>

<style lang="scss">
.vue-bpmn-diagram-container {
  height: 100%;
  width: 100%;
}

.bpmn-js-wrapper-hide-drilldown-overlay {
  .djs-overlay-drilldown {
    display: none;
  }
}

.bpmn-js-wrapper-hide-subprocess-breadcrumbs {
  .bjs-breadcrumbs {
    display: none;
  }
}

.orange:not(.djs-connection) .djs-visual > :nth-child(1) {
  fill: orange !important;
}

.white:not(.djs-connection) .djs-visual > :nth-child(1) {
  fill: white !important;
}

.green:not(.djs-connection) .djs-visual > :nth-child(1) {
  fill: #dcffd6ff !important;
}

.red:not(.djs-connection) .djs-visual > :nth-child(1) {
  fill: #ffd3d3ff !important;
}
.bjs-breadcrumbs {
  left: -10px !important;
  top: unset;
  bottom: 10px;
}
</style>
