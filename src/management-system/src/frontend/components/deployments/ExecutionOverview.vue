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
      <template v-slot:process-preview v-if="isSelectedElementSubprocess">
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
      :subprocessId="subprocessId"
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
    <div class="breadcrumb-menu">
      <v-breadcrumbs style="padding: 0px 12px" :items="breadcrumbItems">
        <template v-slot:divider>
          <v-icon>mdi-chevron-right</v-icon>
        </template>
        <template v-slot:item="{ item }">
          <v-breadcrumbs-item class="breadcrumb-item" @click.stop="selectBreadcrumbItem(item.id)">
            <v-icon style="font-size: 1rem" class="mr-2" v-if="item.id === 'mainView'"
              >mdi-chevron-right</v-icon
            >
            <span
              :class="{
                caption: true,
                'font-weight-bold':
                  breadcrumbItems.findIndex((bItem) => bItem.id === item.id) ===
                  breadcrumbItems.length - 1,
              }"
              style="font-size: 1rem !important"
              >{{ item.text }}</span
            >
          </v-breadcrumbs-item>
        </template>
      </v-breadcrumbs>
    </div>
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
      subprocessId: null,
      subprocessBreadcrumbItems: [],
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
    isSelectedElementSubprocess() {
      if (this.selectedElement) {
        return this.selectedElement.type === 'bpmn:SubProcess';
      }
      return false;
    },
    breadcrumbItems() {
      return [{ text: 'Root Process', id: 'mainView' }, ...this.subprocessBreadcrumbItems];
    },
  },
  methods: {
    setViewer(viewer) {
      this.viewer = viewer;
    },
    selectBreadcrumbItem(itemId) {
      const indexItem = this.subprocessBreadcrumbItems.findIndex((item) => item.id === itemId);
      if (indexItem > -1) {
        this.subprocessId = itemId;
      } else {
        // main process was selected
        this.subprocessId = null;
      }
      this.subprocessBreadcrumbItems = this.subprocessBreadcrumbItems.slice(0, indexItem + 1);
    },
    openSubprocess(subprocess) {
      this.clickedElement = null;
      this.subprocessId = subprocess.id;
      this.subprocessBreadcrumbItems.push({
        text: subprocess.name || subprocess.id,
        id: subprocess.id,
      });
    },
    /**
     * If the clicked element is not the whole process or a sequence flow, set the clicked element and get its meta information
     * @param {Object} element - the clicked element
     */
    handleElementClick(element) {
      if (element.type === 'bpmn:Process' || element.type === 'bpmn:SequenceFlow') {
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
  },
};
</script>

<style lang="scss" scoped>
.breadcrumb-menu {
  position: absolute;
  left: 0px;
  bottom: 15px;

  .breadcrumb-item {
    cursor: pointer;
  }
}

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
