<template>
  <div>
    <process-modal
      callToActionText="Open in new tab"
      :show="showNewTabDialog"
      maxWidth="800px"
      @cancel="showNewTabDialog = false"
      @click:bpmnPreview="addTab"
    ></process-modal>

    <alert-window :popupData="popupData" />

    <v-tabs v-model="currentTabIndex" show-arrows="mobile" class="process-tabs flex-grow-0">
      <v-btn class="ml-2 mt-2" fab x-small color="primary" @click="$emit('returnToOverview')">
        <v-icon> mdi-arrow-left </v-icon>
      </v-btn>
      <process-tab
        v-for="(tab, index) in tabs"
        :key="index"
        :processDefinitionsId="tab.processDefinitionsId"
        :subprocessId="tab.subprocessId"
        :version="tab.version"
        @addTab="addTab($event.processDefinitionsId, $event.subprocessId, $event.version)"
        @deleteTab="deleteTab(tab)"
      />
      <v-btn class="d-flex align-self-center" icon center @click="showNewTabDialog = true">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-btn class="d-flex align-self-center" plain text center @click="tabs = [currentTab]">
        Clear tab bar
      </v-btn>
    </v-tabs>
  </div>
</template>
<script>
import ProcessTab from '@/frontend/components/processes/editor/ProcessTab.vue';
import ProcessModal from '@/frontend/components/processes/editor/ProcessModal.vue';
import AlertWindow from '@/frontend/components/universal/Alert.vue';

import { eventHandler, processInterface } from '@/frontend/backend-api/index.js';

export default {
  components: { ProcessTab, ProcessModal, AlertWindow },
  data() {
    return {
      currentTabIndex: 0,
      tabs: [],

      popupData: {
        body: '',
        display: 'none',
        color: 'warning',
      },

      showNewTabDialog: false,

      processRemovedCallback: null,
    };
  },
  computed: {
    currentTab() {
      if (this.currentTabIndex > -1 && this.currentTabIndex < this.tabs.length) {
        return this.tabs[this.currentTabIndex];
      }
      return undefined;
    },
  },
  methods: {
    async addTab(processDefinitionsId, subprocessId, version, instanceId) {
      // lookup if the tab which should be added already exists
      const selectedTab = this.tabs.find(
        (tab) =>
          tab.processDefinitionsId === processDefinitionsId &&
          tab.subprocessId === subprocessId &&
          tab.version === version &&
          tab.instanceId === instanceId
      );
      if (selectedTab) {
        this.currentTabIndex = this.tabs.indexOf(selectedTab);
        this.showNewTabDialog = false;
        return;
      }

      const newTab = {
        processDefinitionsId,
        subprocessId,
        version,
        instanceId,
      };

      // to insert the new process tab infront of potential subprocesses tabs
      const subprocessTabIndex = this.tabs.findIndex(
        (tab) =>
          tab.processDefinitionsId === processDefinitionsId && tab.subprocessId && !subprocessId
      );
      if (subprocessTabIndex !== -1) {
        this.tabs.splice(subprocessTabIndex, 0, newTab);
      } else {
        this.tabs.push(newTab);
      }

      // switch to the added tab
      this.currentTabIndex = this.tabs.findIndex(
        (tab) =>
          tab.processDefinitionsId === processDefinitionsId &&
          tab.subprocessId === subprocessId &&
          tab.version === version &&
          tab.instanceId === instanceId
      );

      this.showNewTabDialog = false;
    },
    /** */
    deleteTab(tab) {
      const index = this.tabs.indexOf(tab);
      this.tabs.splice(index, 1);
      if (this.tabs.length === 0) {
        this.$emit('returnToOverview');
      }
    },
    // Tries to pull the process that is supposed to be modeled from the backend
    async pullProcess(id) {
      try {
        const process = await processInterface.pullProcess(id);
        const bpmn = process.bpmn;
        delete process.bpmn;
        await this.$store.dispatch('processStore/add', { process, bpmn });
      } catch (err) {
        throw new Error(`Could not find process with id ${id}`);
      }
    },
  },
  watch: {
    currentTab: {
      handler() {
        if (this.currentTab) {
          const newPath = this.$router.resolve({
            params: { id: this.currentTab.processDefinitionsId },
            query: { instance: this.currentTab.instanceId },
          }).href;

          history.replaceState({}, '', '/' + newPath);

          this.$emit('changedTab', this.currentTab);
        }
      },
      immediate: true,
    },
  },
  mounted() {
    this.processRemovedCallback = eventHandler.on('processRemoved', ({ processDefinitionsId }) => {
      const deletedTab = this.tabs.find((tab) => tab.processDefinitionsId === processDefinitionsId);
      if (deletedTab) {
        this.deleteTab(deletedTab);
        this.popupData.body = 'A process was deleted so its tab was automatically removed';
        this.popupData.display = 'block';
      }
    });
  },
  async beforeMount() {
    const routerProcessDefinitionsId = this.$router.currentRoute.params.id;

    const routerInstanceId = this.$router.currentRoute.query.instance;

    if (routerProcessDefinitionsId) {
      // check if the process is locally available
      if (!this.$store.getters['processStore/processById'](routerProcessDefinitionsId)) {
        // if not try pulling it from the backend
        await this.pullProcess(routerProcessDefinitionsId);
      }
      this.addTab(routerProcessDefinitionsId, undefined, undefined, routerInstanceId);
    }
  },
  beforeDestroy() {
    if (this.processRemovedCallback) {
      eventHandler.off('processRemoved', this.processRemovedCallback);
    }
  },
};
</script>
<style scoped>
.process-tabs > .v-tabs-bar {
  position: relative;
}
.process-tabs > .v-tabs-bar::before {
  background-color: currentColor;
  bottom: 0;
  content: '';
  left: 0;
  opacity: 0.12;
  pointer-events: none;
  position: absolute;
  right: 0;
  top: 0;
}
</style>
