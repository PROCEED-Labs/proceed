<template>
  <div class="instance-viewer">
    <hovering-toolbar justify="space-between" v-show="!hideToolbar">
      <div style="flex: 1 1 fit-content">
        <slot name="toolbar" :usedVersion="versionToShowInfo"></slot>
      </div>
      <div style="flex: 0 1 fit-content; display: flex; flex-wrap: wrap">
        <instance-control
          v-if="deployment && instance"
          :deployment="deployment"
          :instance="instance"
          :isProject="isProjectView"
          :engineOffline="engineOffline"
        />
        <token-toolbar
          v-if="deployment && instance"
          :viewer="viewer"
          :instance="instance"
          :deployment="deployment"
          :hideToolbar="true"
          @selectionChanged="$emit('tokenSelectionChanged', $event)"
        />
      </div>
    </hovering-toolbar>
    <slot name="content" :usedVersion="versionToShowInfo"></slot>
    <BPMNWrapper
      v-if="bpmnViewerXml"
      viewerMode="navigated-viewer"
      :xml="bpmnViewerXml"
      :flowElementsStyling="flowElementsStyling"
      :subprocessId="subprocessId"
      :showDrilldownOverlay="!hideToolbar"
      :showSubprocessBreadcrumbs="!hideToolbar"
      @element:click="handleElementClick"
      @element:hover="handleElementHover"
      @element:out="handleElementOut"
      @element:dblclick="handleElementDoubleClick"
      @newViewer="setViewer"
    ></BPMNWrapper>
  </div>
</template>
<script>
import BPMNWrapper from '@/frontend/components/bpmn/BpmnJsWrapper.vue';
import TokenToolbar from './Tokens.vue';

import HoveringToolbar from '@/frontend/components/universal/toolbar/HoveringToolbar.vue';
import InstanceControl from '@/frontend/components/deployments/InstanceControl.vue';

import { removeColorFromAllElements } from '@proceed/bpmn-helper';

import { calculateProgress, getPlannedEnd } from '@/frontend/helpers/instance-information';
import { getMetaData } from '@/frontend/helpers/bpmn-modeler-events/getters.js';

import { findLast } from '@/shared-frontend-backend/helpers/arrayHelpers.js';

import { getBBox } from 'diagram-js/lib/util/Elements.js';

export default {
  props: {
    deployment: { type: Object },
    instance: { type: Object },
    isProjectView: { type: Boolean, default: false },
    subprocessId: { type: String },
    hideToolbar: { type: Boolean },
    engineOffline: {
      type: Boolean,
    },
    selectedVersion: {
      type: Object,
    },
  },
  components: {
    BPMNWrapper,
    HoveringToolbar,
    TokenToolbar,
    InstanceControl,
  },
  data() {
    return {
      instanceFlowElements: [],
      bpmnViewerXml: null,
      hoveredElement: null,
      clickedElement: null,
      activeStates: ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'],
      stopFetching: false,
      singleClickTimeout: null,
      viewer: null,
      implicitTimeColorChangeTimeout: null,
    };
  },
  computed: {
    /**
     * selected coloring mode for the process visualisation
     */
    colors() {
      const value = this.$store.getters['userPreferencesStore/getExecutionColorMode'];

      // if instance state colors are selected but no instance is selected fall back to process colors
      if (!this.instance && (value === 'timeColors' || value === 'executionColors')) {
        return 'processColors';
      } else {
        return value;
      }
    },
    /**
     * styles for process elements
     */
    flowElementsStyling() {
      if (!this.instance) {
        return [];
      }

      return this.instanceFlowElements
        .map((element) => {
          const metaData = getMetaData(element);

          let timeInfo = { startTime: null, endTime: null };

          const token = this.instance.tokens.find(
            (token) => token.currentFlowElementId === element.id
          );

          if (token) {
            timeInfo.startTime = token.currentFlowElementStartTime;
          }

          const logEntry = findLast(
            this.instance.log,
            (entry) => entry.flowElementId === element.id
          );

          // if there is no more up to date token based time info use log info if some exists
          if (!token && logEntry) {
            timeInfo = logEntry;
          }

          let color;
          switch (this.colors) {
            case 'timeColors':
              color = calculateProgress(metaData, timeInfo);
              break;
            case 'noColors':
              color = 'white';
              break;
            case 'executionColors':
              color = `${this.getExecutionColor(logEntry && logEntry.executionState)}`;
              break;
            default:
              color = '';
          }

          return {
            elementId: element.id,
            type: element.type,
            color,
            token,
            metaData,
          };
        })
        .filter((flowElement) => flowElement.color && flowElement.type !== 'bpmn:Process');
    },
    versionToShow() {
      if (this.instance) {
        return this.instance.processVersion;
      }

      if (this.selectedVersion) {
        return this.selectedVersion.version;
      }

      // show the latest version if no instance is selected
      const versions = this.deployment.versions.map(({ version }) => version);
      return versions.sort((a, b) => b - a)[0];
    },
    versionToShowInfo() {
      return this.deployment.versions.find((info) => info.version == this.versionToShow);
    },
  },
  methods: {
    setViewer(viewer) {
      this.viewer = viewer;

      const elementRegistry = this.viewer.get('elementRegistry');
      this.instanceFlowElements = elementRegistry.getAll();

      this.viewer.get('eventBus').on('import.done', () => {
        this.instanceFlowElements = elementRegistry.getAll();
      });

      this.$emit('newViewer', viewer);
    },
    /**
     * set xml for bpmn viewer: remove stored colors from all elements if other color mode than 'processColors' is selected
     */
    async setBpmnViewerXml() {
      if (!this.versionToShowInfo) {
        return;
      }

      let xml = this.versionToShowInfo.bpmn;

      if (this.colors !== 'processColors') {
        xml = await removeColorFromAllElements(xml);
      }

      this.bpmnViewerXml = xml;
    },
    getExecutionColor(executionState) {
      switch (executionState) {
        case 'COMPLETED':
          return 'green';
        case 'ERROR-SEMANTIC':
        case 'ERROR-TECHNICAL':
        case 'ERROR-CONSTRAINT_UNFULFILLED':
        case 'STOPPED':
        case 'ABORTED':
        case 'FAILED':
        case 'TERMINATED':
          return 'red';
        default:
          // SKIPPED
          return 'white';
      }
    },
    handleElementHover({ element }) {
      if (element.type === 'bpmn:Process') {
        this.hoveredElement = null;
      } else {
        this.hoveredElement = element;
      }
    },
    handleElementOut({ element }) {
      if (this.hoveredElement && this.hoveredElement.id === element.id) {
        this.hoveredElement = null;
      }
    },

    handleElementClick({ element }) {
      if (!this.singleClickTimeout) {
        this.singleClickTimeout = setTimeout(() => {
          if (element.type === 'bpmn:Process' || element.id.includes('_plane')) {
            this.clickedElement = null;
          } else {
            let canvas = this.viewer.get('canvas');
            canvas.zoom(1.0);
            var viewbox = canvas.viewbox();
            const box = getBBox(element);

            var newViewbox = {
              x: box.x - 100,
              y: box.y + box.height / 2 - viewbox.outer.height / 2,
              width: viewbox.outer.width,
              height: viewbox.outer.height,
            };
            canvas.viewbox(newViewbox);

            this.clickedElement = element;
          }
          this.$emit('element:click', element);
          this.singleClickTimeout = null;
        }, 300);
      }
    },
    handleElementDoubleClick({ element }) {
      if (this.singleClickTimeout) {
        clearTimeout(this.singleClickTimeout);
        this.singleClickTimeout = null;
      }
      this.$emit('element:dblclick', element);
    },
  },
  beforeDestroy() {
    if (this.viewer) {
      this.viewer.destroy();
    }
  },
  watch: {
    async colors(newValue, oldValue) {
      if (newValue !== oldValue) {
        await this.setBpmnViewerXml();
      }
    },
    /**
     * Used to force a recomputation of the styling when time based coloring is selected which makes use of non-reactive data (the current time)
     */
    async flowElementsStyling(newValue) {
      if (this.implicitColorChangeTimeout) {
        clearTimeout(this.implicitColorChangeTimeout);
        this.implicitColorChangeTimeout = null;
      }

      if (this.colors !== 'timeColors' || !newValue) return;

      // if time colors are selected and at least one element has a time based coloring that may still reach the final (red) state
      // => make sure that the visualisation is updated when the color would change even if the instance information is not explicitly updated
      // (this is necessary since time coloring based on tokens is calculated using the current time which is not reactive in the used computed property)
      const pendingTokenBasedColoringUpdates = newValue.filter(
        (coloring) => coloring.token && (coloring.color === 'green' || coloring.color === 'orange')
      );

      if (pendingTokenBasedColoringUpdates.length) {
        let smallestUpdateTime = Infinity;

        // find the smallest time after which we have to update the visualisation
        pendingTokenBasedColoringUpdates.forEach((coloring) => {
          const start = coloring.metaData.timePlannedOccurrence
            ? new Date(coloring.metaData.timePlannedOccurrence).getTime()
            : coloring.token.currentFlowElementStartTime;

          let end = getPlannedEnd(start, coloring.metaData.timePlannedDuration).getTime();

          if (coloring.color === 'green') {
            // the coloring should change to orange after 70% of the expected time elapsed
            let critical = Math.floor(0.7 * (end - start));
            end = start + critical;
          }

          const remaining = end - new Date().getTime();

          if (remaining < smallestUpdateTime) smallestUpdateTime = remaining;
        });

        // force a recalculation of the flowElementsStyling after the computed time has elapsed
        this.implicitColorChangeTimeout = setTimeout(
          () => (this.instanceFlowElements = [...this.instanceFlowElements]),
          smallestUpdateTime
        );
      }
    },
    versionToShowInfo: {
      async handler() {
        if (this.versionToShowInfo) {
          await this.setBpmnViewerXml();
        }
      },
      immediate: true,
    },
  },
};
</script>
<style lang="scss" scoped>
.instance-viewer {
  height: 100%;
  width: 100%;
}

.wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
}
</style>
