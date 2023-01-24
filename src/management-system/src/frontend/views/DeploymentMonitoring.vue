<template>
  <div class="wrapper">
    <popup :popupData="popupData" />
    <div class="d-flex flex-grow-1" v-if="deployment">
      <div class="d-flex flex-grow-1">
        <execution-overview
          :deployment="deployment"
          :selectedVersion="selectedVersion"
          :instance="selectedInstanceFullInfo"
          :showProcessInfo.sync="showProcessInfo"
        >
          <template #toolbar="{ usedVersion }">
            <deployment-toolbar :title="latestVersionName" :instance="selectedInstanceFullInfo">
              <v-divider vertical inset />
              <tooltip-button
                color="primary"
                :loading="isStartingInstance"
                @click.stop="startInstance"
              >
                <template #tooltip-text>Start New Instance With Latest Version</template>
                mdi-plus-circle-outline
              </tooltip-button>
              <v-divider vertical inset />
              <toolbar-menu
                v-model="selectedInstance"
                :items="selectableInstances"
                itemTextattribute="text"
                :noSelectionText="
                  selectableInstances.length ? '(No instance selected)' : '(No instance started)'
                "
              >
                <template #open-hint>Select Instance</template>
                <template v-if="selectedVersion && selectableInstances.length" #list-prepend>
                  <v-list-item
                    style="color: darkgray; font-style: italic"
                    @click="selectedVersion = null"
                    >(Show all instances)</v-list-item
                  >
                </template>
              </toolbar-menu>
              <tooltip-button :disabled="!selectedInstance" @click="editInstance">
                <template #tooltip-text>Edit Instance</template>
                mdi-pencil-outline
              </tooltip-button>
              <v-divider vertical inset />
              <tooltip-button @click.stop="showVersionToolbar = !showVersionToolbar">
                <template v-if="!showVersionToolbar" #tooltip-text>Show Version Toolbar</template>
                <template v-else #tooltip-text>Hide Version Toolbar</template>
                {{ !!selectedVersion ? 'mdi-filter-menu' : 'mdi-filter-outline' }}
              </tooltip-button>
              <v-divider vertical inset />
              <tooltip-button @click="showProcessInfo = !showProcessInfo">
                <template #tooltip-text>Show Process Info</template>
                mdi-information-outline
              </tooltip-button>
            </deployment-toolbar>
            <version-toolbar
              v-show="showVersionToolbar"
              :selectedVersion="selectedVersion"
              @selectionChange="selectedVersion = $event"
              :deployment="deployment"
              :selectableVersions="selectableVersions"
              :selectableInstances="selectableInstances"
              :selectedInstance="selectedInstance"
              @newInstance="selectInstance"
            />
          </template>
        </execution-overview>
      </div>
    </div>
  </div>
</template>
<script>
import { engineNetworkInterface } from '@/frontend/backend-api/index.js';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import DeploymentToolbar from '@/frontend/components/deployments/DeploymentToolbar.vue';
import VersionToolbar from '@/frontend/components/deployments/VersionToolbar.vue';
import ExecutionOverview from '@/frontend/components/deployments/ExecutionOverview.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';
import ToolbarMenu from '@/frontend/components/universal/toolbar/ToolbarMenu.vue';
import { setDefinitionsId, setTargetNamespace } from '@proceed/bpmn-helper';

import { convertToEditableBpmn } from '@/shared-frontend-backend/helpers/processVersioning.js';
import { asyncForEach, sleep } from '@/shared-frontend-backend/helpers/javascriptHelpers';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:DeploymentMonitoring
 */
export default {
  components: {
    ExecutionOverview,
    popup: AlertWindow,
    DeploymentToolbar,
    VersionToolbar,
    TooltipButton,
    ToolbarMenu,
  },
  data() {
    return {
      /** */
      selectedVersion: null,

      selectedInstance: null,
      isStartingInstance: false,

      /** */
      activeStates: ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'],
      popupData: {
        body: '',
        display: 'none',
        color: '',
      },

      showVersionToolbar: false,

      initialInstanceQuery: this.$router.currentRoute.query.instance,
      showProcessInfo: false,
    };
  },
  computed: {
    /**
     * All process deployments on known machines
     */
    deployedProcesses() {
      return this.$store.getters['deploymentStore/deployments'];
    },
    /**
     * The wanted deployment
     */
    deployment() {
      const processDefinitionsId = this.$router.currentRoute.params.id;
      return this.deployedProcesses[processDefinitionsId];
    },
    selectableVersions() {
      if (!this.deployment) return [];

      return this.deployment.versions.concat().sort((a, b) => b.version - a.version);
    },
    /**
     * Sorted instances in the deployment augmented with a title for the selection
     */
    selectableInstances() {
      if (!this.deployment) return [];
      const sortedInstances = Object.values(this.deployment.instances)
        .concat() // create a copy of the array because the sorting is taking changes in place => side effects in store
        .sort((i1, i2) => new Date(i2.globalStartTime) - new Date(i1.globalStartTime))
        .map((instance, index) => ({
          ...instance,
          text: `${index + 1}. Instance: ${new Date(instance.globalStartTime).toLocaleString()}`,
        }));

      if (this.selectedVersion) {
        return sortedInstances.filter(
          (instance) => instance.processVersion == this.selectedVersion.version
        );
      }

      return sortedInstances;
    },
    selectedInstanceFullInfo() {
      if (!this.selectedInstance) return null;

      return this.$store.getters['deploymentStore/instances'][
        this.selectedInstance.processInstanceId
      ];
    },
    /**
     * If the selected instance is currently running
     */
    selectedIsRunning() {
      if (this.selectedInstanceFullInfo) {
        return this.selectedInstanceFullInfo.instanceState.some((state) =>
          this.activeStates.includes(state)
        );
      } else {
        return false;
      }
    },
    latestVersionName() {
      const versions = [...this.deployment.versions];

      const latestVersion = versions.sort((a, b) => b - a)[0];

      return latestVersion.name || latestVersion.definitionName;
    },
  },
  methods: {
    selectInstance(instanceId) {
      const newInstance = this.selectableInstances.find(
        (instance) => instance.processInstanceId === instanceId
      );

      if (newInstance) {
        this.selectedInstance = newInstance;
      }
    },
    /**
     * Start a new instance of the deployed process using the latest version
     */
    async startInstance() {
      this.isStartingInstance = true;
      try {
        const version = this.selectableVersions[0].version;

        const instanceId = await engineNetworkInterface.startInstance(
          this.deployment.definitionId,
          version
        );

        await sleep(0.2);

        this.selectInstance(instanceId);

        this.popupData.body = 'Executing process instance';
        this.popupData.color = 'success';
        setTimeout(() => {
          this.popupData.display = 'none';
        }, 5000);
      } catch (err) {
        this.popupData.body = 'Error starting the process instance';
        this.popupData.color = 'error';
        console.error(err);
      }
      this.isStartingInstance = false;
      this.openPopup();
    },
    async editInstance() {
      const instance = this.selectedInstance;
      const instanceProcessId = `${this.deployment.definitionId}-instance-${this.selectedInstance.processInstanceId}`;

      try {
        // Setup the instance adaptation process which is basically a placeholder in which we can make changes to the bpmn that is used by the instance
        // This is needed since we only allow one "editable version" for a process
        // otherwise the instance editing would have to replace the current "editable version" of the process

        // pull the user tasks and imports of the process version
        let { bpmn: originalInstanceBpmn, userTasks: instanceUserTasks } =
          await engineNetworkInterface.getFullProcessVersionData(
            this.deployment.definitionId,
            instance.processVersion
          );

        let { bpmn: instanceBpmn, changedFileNames } = await convertToEditableBpmn(
          originalInstanceBpmn
        );

        // ensure that the old process is not set as the "originalId"
        instanceBpmn = await setDefinitionsId(instanceBpmn, undefined);
        instanceBpmn = await setTargetNamespace(instanceBpmn, undefined);

        // try adding the adaptation process (this will throw if the process already exists; in that case we can just open the process without any further actions)
        await this.$store.dispatch('processStore/add', {
          process: {
            id: instanceProcessId,
            type: 'process-instance',
            shared: true,
          },
          bpmn: instanceBpmn,
        });

        await new Promise((resolve) => setTimeout(resolve, 20));

        await asyncForEach(Object.keys(changedFileNames), async (versionedFileName) => {
          // save the editable versions of the user tasks
          await this.$store.dispatch('processStore/saveUserTask', {
            processDefinitionsId: instanceProcessId,
            taskFileName: changedFileNames[versionedFileName],
            html: instanceUserTasks[versionedFileName],
          });
          // store the original versions of the user tasks
          await this.$store.dispatch('processStore/saveUserTask', {
            processDefinitionsId: instanceProcessId,
            taskFileName: versionedFileName,
            html: instanceUserTasks[versionedFileName],
          });
        });
        // TODO: how to handle imported processes (especially if they are not known locally)?

        // ensure that the temporary id used in the editable instance process is not mistakenly considered a change of the diagram
        originalInstanceBpmn = await setDefinitionsId(originalInstanceBpmn, undefined);
        originalInstanceBpmn = await setTargetNamespace(originalInstanceBpmn, undefined);
        originalInstanceBpmn = await setDefinitionsId(originalInstanceBpmn, instanceProcessId);
        originalInstanceBpmn = await setTargetNamespace(originalInstanceBpmn, instanceProcessId);

        // store the original bpmn of the version we are editing as well
        await this.$store.dispatch('processStore/addVersion', {
          id: instanceProcessId,
          bpmn: originalInstanceBpmn,
        });
      } catch (err) {}

      // switch to the editor with information about the instance to edit
      let query;
      query = { instance: instance.processInstanceId };
      this.$router.push({
        name: 'edit-process-bpmn',
        params: { id: instanceProcessId },
        query,
      });
    },
    /** */
    openPopup() {
      this.popupData.display = 'block';
    },
  },
  watch: {
    /**
     * Makes sure that the selected instance stays the same if the list of selectable instances changes
     */
    selectableInstances: {
      async handler(newInstances) {
        if (newInstances && newInstances.length) {
          const instanceQuery =
            this.initialInstanceQuery ||
            (this.selectedInstance && this.selectedInstance.processInstanceId);
          if (
            instanceQuery &&
            newInstances.some((instance) => instance.processInstanceId === instanceQuery)
          ) {
            // ensure that the instance that was requested through the query parameter in the url is selected when the first instance information becomes available
            this.selectedInstance = newInstances.find(
              (instance) => instance.processInstanceId === instanceQuery
            );
          } else {
            // if there is no request for an instance or the currently selected instance is not among the available ones => display another instance
            this.selectedInstance = this.selectableInstances[0];
          }

          // the query parameter in the URL should only be used to select an instance when the view is opened
          this.initialInstanceQuery = null;
        } else {
          this.selectedInstance = null;
        }
      },
      immediate: true,
    },

    selectedInstance: {
      async handler(newInstance, oldInstance) {
        if (
          oldInstance &&
          (!newInstance || newInstance.processInstanceId !== oldInstance.processInstanceId)
        ) {
          this.$store.dispatch(
            'deploymentStore/unsubscribeFromInstanceUpdates',
            oldInstance.processInstanceId
          );
        }

        if (
          newInstance &&
          (!oldInstance || newInstance.processInstanceId !== oldInstance.processInstanceId)
        ) {
          this.$store.dispatch('deploymentStore/subscribeForInstanceUpdates', {
            definitionId: this.deployment.definitionId,
            instanceId: newInstance.processInstanceId,
          });
        }

        // show the id of the selected instance in the query parameters of the url
        const newPath = this.$router.resolve({
          query: { instance: newInstance && newInstance.processInstanceId },
        }).href;

        history.replaceState({}, '', '/' + newPath);
      },
      immediate: true,
    },
  },
  /**
   * Signals to the backend that updates for this deployment are wanted
   */
  mounted() {
    this.$store.dispatch('deploymentStore/subscribeForDeploymentUpdates');
  },
  async beforeRouteLeave(to, from, next) {
    this.$store.dispatch('deploymentStore/unsubscribeFromDeploymentUpdates');
    if (this.selectedInstance) {
      this.$store.dispatch(
        'deploymentStore/unsubscribeFromInstanceUpdates',
        this.selectedInstance.processInstanceId
      );
    }
    next();
  },
};
</script>

<style lang="scss" scoped>
.wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
}

.card-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  position: absolute;
  z-index: 1;
  width: 100%; /* Need a specific value to work */
  max-height: 30%;

  .v-card {
    overflow-y: auto;
    // For 3 cards we end up with a content widh of 32% * 3 = 96% plus the margin-right for between the cards 96% + 2% = 98%.
    // Now 2% left for the margin to the left and the right for all cards
    margin-right: 1%;
    width: 32%;
    // height: 100%;

    &:last-child {
      margin-right: 0;
    }
  }
}
.v-divider--vertical.v-divider--inset {
  margin-left: 8px;
  margin-right: 8px;
}
</style>
