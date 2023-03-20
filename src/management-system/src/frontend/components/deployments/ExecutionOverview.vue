<template>
  <div class="d-flex flex-grow-1">
    <ActivityCard
      v-if="selectedElement"
      @close="clickedElement = null"
      :canvasID="canvasID"
      :selectedElement="selectedElement"
      :instance="instance"
      :deployment="deployment"
      :selectedVersion="selectedVersion"
      :metaData="metaData"
      :milestones="selectedElementMilestones"
      :location="location"
      :title="selectedElement.businessObject.name || selectedElement.id"
      :selectedToken="selectedToken"
    >
      <template v-slot:process-preview v-if="isSelectedElementSubprocessElement">
        <div class="d-flex flex-column">
          <instance-view
            :deployment="deployment"
            :instance="instance"
            :subprocessId="selectedElement.id"
            :isProjectView="isProjectView"
            hideToolbar
          />
          <v-btn
            small
            class="align-self-center"
            color="primary"
            v-if="selectedElement.id"
            @click="openSubprocess(selectedElement)"
          >
            Open subprocess
          </v-btn>
        </div>
      </template>
      <template v-slot:additional-content v-if="isProjectView && instance">
        <div class="d-flex justify-center">
          <v-btn color="error" small outlined @click="$emit('deleteDeployment')"
            >Delete Deployment</v-btn
          >
        </div>
      </template>
    </ActivityCard>
    <instance-view
      :deployment="deployment"
      :selectedVersion="selectedVersion"
      :instance="instance"
      :isProjectView="isProjectView"
      @element:click="handleElementClick"
      @element:dblclick="handleElementDoubleClick"
      @newViewer="setViewer"
      :engineOffline="engineOffline"
      @tokenSelectionChanged="handleTokenSelection"
    >
      <template #content="data"><slot name="content" v-bind="data"></slot></template>
      <template #toolbar="data"><slot name="toolbar" v-bind="data"></slot></template>
    </instance-view>
  </div>
</template>

<script>
import { getMetaData, getMilestones } from '@/frontend/helpers/bpmn-modeler-events/getters.js';
import InstanceView from '../../components/deployments/Instance.vue';
import ActivityCard from '@/frontend/components/deployments/activityInfo/ActivityCard.vue';
import { sleep } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

export default {
  name: 'execution-overview',
  props: [
    'deployment',
    'instance',
    'isProjectView',
    'location',
    'engineOffline',
    'selectedVersion',
    'showProcessInfo',
  ],
  components: {
    InstanceView,
    ActivityCard,
  },
  data() {
    return {
      clickedElement: null,
      selectedToken: null,
      viewer: null,
    };
  },
  computed: {
    canvasID() {
      return this.viewer._container.parentElement.id;
    },
    metaData() {
      return getMetaData(this.selectedElement);
    },
    selectedElement() {
      return this.clickedElement ? this.clickedElement : null;
    },
    selectedElementMilestones() {
      return this.selectedElement ? getMilestones(this.selectedElement) : [];
    },
    viewerCanvas() {
      return this.viewer ? this.viewer.get('canvas') : null;
    },
    isSelectedElementSubprocessElement() {
      if (this.selectedElement) {
        // check if we want to show a preview of a selected subprocess in the ActivityCard
        return (
          this.selectedElement.type === 'bpmn:SubProcess' &&
          this.selectedElement.id !== this.viewerCanvas.getRootElement().id // we dont want to show the subprocess preview if the subprocess is already open in the main viewer
        );
      }
      return false;
    },
  },
  methods: {
    setViewer(viewer) {
      this.viewer = viewer;
    },
    openSubprocess(subprocess) {
      // set the plane containing the subprocess content as the new root so it is shown in the viewer
      const canvas = this.viewer.get('canvas');
      const subprocessPlane = canvas.findRoot(`${subprocess.id}_plane`);
      canvas.setRootElement(subprocessPlane);
    },
    /**
     * If the clicked element is not the whole process or a sequence flow, set the clicked element and get its meta information
     * @param {Object} element - the clicked element
     */
    handleElementClick(element) {
      if (
        element.type === 'bpmn:Process' || // allow the user to close the ActivityCard by clicking on the open space
        element.id.includes('_plane') ||
        element.type === 'bpmn:SequenceFlow'
      ) {
        this.clickedElement = null;
      } else {
        this.clickedElement = element;
      }
    },
    handleElementDoubleClick(element) {
      if (element.type === 'bpmn:SubProcess') {
        this.openSubprocess(element.businessObject);
      }
    },
    async handleTokenSelection(token) {
      const { viewer } = this;

      if (token) {
        const tokenElement = viewer.get('elementRegistry').get(token.currentFlowElementId);

        if (tokenElement) {
          const elementToSelect =
            tokenElement.type !== 'bpmn:SequenceFlow' ? tokenElement : undefined;
          viewer.get('selection').select(elementToSelect);
          this.handleElementClick(elementToSelect);
        }
      }
      this.selectedToken = token;
      // make sure that consecutive selections of elements are not affected by the token selection
      await sleep(0.01);
    },
  },
  watch: {
    instance(val) {
      this.selectedToken = null;
    },
    showProcessInfo(val) {
      if (val) {
        this.clickedElement = this.viewer.get('canvas').getRootElement();
      } else {
        this.clickedElement = null;
      }
    },
    clickedElement(element) {
      if (element === null && this.showProcessInfo) {
        this.$emit('update:showProcessInfo', false);
      }
    },
    viewer: {
      handler(newViewer) {
        if (newViewer) {
          // autoselect the plane plane element if the user moves up/down the subprocess tree (unselect potentially selected element that is not visible anymore)
          newViewer.on('root.set', ({ element }) => {
            this.clickedElement = element;
          });
        }
      },
      immediate: true,
    },
  },
};
</script>

<style lang="scss" scoped>
.card-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  position: absolute;
  right: 10px;
  z-index: 10;
  width: 70%; /* Need a specific value to work */
  max-height: 80%;
}

.info-panel-icon {
  display: flex;
  justify-content: center;
  position: absolute;
  right: 0px;
  top: 120px;
}
</style>
