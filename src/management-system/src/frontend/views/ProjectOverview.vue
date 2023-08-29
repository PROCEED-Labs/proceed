<template>
  <div class="editor-explorer">
    <AlertWindow :popupData="popupData" />
    <InactivityAlertWindow :popupData="inactivityWarningData" />

    <execution-overview
      v-if="storedDeployment || deployment"
      :deployment="storedDeployment || deployment"
      :instance="storedInstance"
      :location="location"
      :isProjectView="true"
      :engineOffline="!engineOnline"
      :showProcessInfo.sync="showProjectInfo"
      @element:click="handleElementClick"
      @deleteDeployment="showDeleteDeploymentDialog = true"
    >
      <template #toolbar>
        <deployment-toolbar :title="project.name" :instance="storedInstance">
          <v-menu
            v-if="
              processMetaData.orderCode ||
              processMetaData.customerName ||
              processMetaData.orderNumber
            "
            absolute
            offset-y
          >
            <template #activator="{ on, attrs }">
              <tooltip-button v-on="on" v-bind="attrs">
                <template #tooltip-text>Additional Information</template>
                mdi-chevron-down
              </tooltip-button>
            </template>
            <v-list>
              <v-list-item v-if="processMetaData.orderCode">
                {{ `Project code: ${processMetaData.orderCode}` }}</v-list-item
              >
              <v-list-item v-if="processMetaData.customerName">
                {{ `Customer: ${processMetaData.customerName}` }}</v-list-item
              >
              <v-list-item v-if="processMetaData.orderNumber">
                {{ `Project code: ${processMetaData.orderNumber}` }}</v-list-item
              >
            </v-list>
          </v-menu>
          <v-divider vertical inset />
          <tooltip-button @click="editBpmn">
            <template #tooltip-text>Edit</template>
            mdi-pencil-outline
          </tooltip-button>
          <tooltip-button
            v-if="!projectStarted"
            color="primary"
            :disabled="!engineOnline"
            :loading="startingProject"
            @click="startProject"
          >
            <template #tooltip-text>Start</template>
            mdi-play-circle-outline
          </tooltip-button>
          <tooltip-button
            v-else-if="isProjectStopped"
            color="primary"
            :loading="showRestartDialog"
            :disabled="!engineOnline"
            @click="showRestartDialog = true"
          >
            <template #tooltip-text>Restart</template>
            mdi-replay
          </tooltip-button>
          <v-divider vertical inset />
          <v-badge inline left color="grey">{{
            project.planningStatus || 'Planning Status'
          }}</v-badge>
          <v-badge class="ml-2" inline left color="grey">{{
            project.scheduleStatus || 'Schedule Status'
          }}</v-badge>
          <tooltip-button @click="showProjectInfo = !showProjectInfo">
            <template #tooltip-text>Show Project Info</template>
            mdi-information-outline
          </tooltip-button>
        </deployment-toolbar>
      </template>
    </execution-overview>

    <confirmation
      title="restart the project?"
      continueButtonText="Restart Project"
      continueButtonColor="primary"
      :show="showRestartDialog"
      maxWidth="500px"
      @cancel="showRestartDialog = false"
      @continue="restartProject"
    >
      <div>
        Project will restart from beginning. Information about current project will be deleted
        irrecoverably.
      </div>
    </confirmation>

    <confirmation
      title="Delete the deployment?"
      continueButtonText="Delete Deployment"
      continueButtonColor="primary"
      :show="showDeleteDeploymentDialog"
      maxWidth="500px"
      @cancel="showDeleteDeploymentDialog = false"
      @continue="deleteDeployment"
    >
      <div>
        You are about to delete the Deployment! Information of current project will be deleted
        irrecoverably.
      </div>
    </confirmation>
  </div>
</template>

<script>
import {
  getAllBpmnFlowNodeIds,
  setMachineInfo,
  setDeploymentMethod,
  getMetaData,
  getProcessIds,
} from '@proceed/bpmn-helper';
import { engineNetworkInterface } from '../backend-api/index.js';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import InactivityAlertWindow from '@/frontend/components/universal/InactivityAlert.vue';
import Confirmation from '@/frontend/components/universal/Confirmation.vue';
import DeploymentToolbar from '@/frontend/components/deployments/DeploymentToolbar.vue';
import ExecutionOverview from '@/frontend/components/deployments/ExecutionOverview.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

import { createNewProcessVersion } from '@/frontend/components/universal/ProcessVersioning/helpers.js';
/**
 * @module views
 */
/**
 * @memberof module:views
 */
/**
 * This view is opened when you click on the "Open Project" in the Projects views.
 * It shows the bpmn diagram of a project (without the option to edit it)
 * If the project was started (it was deployed and an instance exists), instance info
 * is also shown.
 *
 * @module Vue:ProjectOverview
 *
 * @vue-computed {Object} project
 * @vue-computed {Object} selectedElement - the activity/event for which detailed info should be shown
 * @vue-computed {String} startTime - the time when the project was started, empty if hasn't started yet
 * @vue-computed {Boolean} isProjectRunning - if yes, the stop instance button is enabled
 * @vue-computed {String} engineUrl - the address of the engine on which the Project is supposed to be executed
 * @vue-computed {String} engineHost - the ip-address of the engine
 * @vue-computed {String} enginePort - the port of the engine
 */

export default {
  name: 'project-overview',
  components: {
    AlertWindow,
    InactivityAlertWindow,
    Confirmation,
    ExecutionOverview,
    DeploymentToolbar,
    TooltipButton,
  },
  data() {
    return {
      clickedElement: null,
      showRestartDialog: false,
      showDeleteDeploymentDialog: false,
      showProjectInfo: false,
      startingProject: false,
      popupData: {
        body: '',
        display: 'none',
        color: '',
        metaData: '',
      },
      inactivityWarningData: {
        display: 'none',
        color: 'info',
      },
      deployment: null,
      pollingInterval: null,
      location: {
        timeZone: 'Europe/Berlin',
      },
      isInfoPanelVisible: false,
      metaData: {},
      processMetaData: {},
    };
  },
  computed: {
    project() {
      return this.$store.getters['processStore/processById'](this.$router.currentRoute.params.id);
    },
    storedDeployment() {
      return this.$store.getters['deploymentStore/deployments'][
        this.$router.currentRoute.params.id
      ];
    },
    storedDeploymentInstanceInfo() {
      if (!this.storedDeployment) return null;

      return Object.values(this.storedDeployment.instances)[0];
    },
    storedInstance() {
      if (!this.storedDeploymentInstanceInfo) {
        return undefined;
      }

      return this.$store.getters['deploymentStore/instances'][
        this.storedDeploymentInstanceInfo.processInstanceId
      ];
    },
    latestVersion() {
      if (!this.project.versions.length) {
        return undefined;
      }

      return this.project.versions[0];
    },
    selectedElement() {
      return this.clickedElement ? this.clickedElement : null;
    },
    startTime() {
      if (this.storedInstance) {
        return new Date(this.storedInstance.globalStartTime).toLocaleString('en-US', this.location);
      }
      return '';
    },
    projectStarted() {
      return !!(this.storedInstance && Object.keys(this.storedInstance).length > 0);
    },
    isProjectRunning() {
      const runningStates = ['RUNNING', 'READY', 'DEPLOYMENT-WAITING'];
      if (this.storedInstance) {
        return this.storedInstance.instanceState.some((state) => runningStates.includes(state));
      } else {
        return false;
      }
    },
    isProjectStopped() {
      if (this.storedInstance) {
        return this.storedInstance.instanceState.some((state) => state === 'STOPPED');
      } else {
        return false;
      }
    },
    engineUrl() {
      return this.$store.getters['configStore/config'].processEngineUrl;
    },
    engineHost() {
      return this.engineUrl.split(':')[0];
    },
    enginePort() {
      return this.engineUrl.split(':')[1];
    },
    engineOnline() {
      // TODO: make sure that the machine that is mentioned in the config is always polled with the other machines and put into the machine store
      const machine = this.$store.getters['machineStore/machines'].find(
        (machine) => this.engineUrl === `${machine.ip}:${machine.port}`,
      );

      return machine && machine.status === 'CONNECTED';
    },
  },
  watch: {
    project: {
      async handler(newProject) {
        if (newProject) {
          const newXml = await this.$store.getters['processStore/xmlById'](
            this.$router.currentRoute.params.id,
          );

          const [processId] = await getProcessIds(newXml);

          this.processMetaData = await getMetaData(newXml, processId);

          this.deployment = {
            ...this.deployment,
            versions: [
              ...this.deployment.versions,
              { definitionName: newProject.name, bpmn: newXml, version: +new Date() },
            ],
          };
        }
      },
      immediate: true,
    },
    storedDeploymentInstanceInfo(newInfo, oldInfo) {
      if (oldInfo && (!newInfo || newInfo.processInstanceId !== oldInfo.processInstanceId)) {
        this.$store.dispatch(
          'deploymentStore/unsubscribeFromInstanceUpdates',
          oldInfo.processInstanceId,
        );
      }

      if (newInfo && (!oldInfo || newInfo.processInstanceId !== oldInfo.processInstanceId)) {
        this.$store.dispatch('deploymentStore/subscribeForInstanceUpdates', {
          definitionId: this.storedDeployment.definitionId,
          instanceId: newInfo.processInstanceId,
        });
      }
    },
    async storedInstance(newInstance) {
      if (newInstance) {
        if (
          !this.project.versions.some(
            ({ version }) => this.storedInstance.processVersion == version,
          )
        ) {
          await this.$store.dispatch('processStore/addVersion', {
            id: this.storedInstance.processId,
            bpmn: this.storedDeployment.versions.find(
              ({ version }) => version == this.storedInstance.processVersion,
            ).bpmn,
          });
        }
      }
    },
  },
  methods: {
    /**
     * Opens the ProcesBpmnEditor view
     */
    editBpmn() {
      let query;

      if (this.storedInstance) {
        query = { instance: this.storedInstance.processInstanceId };
      }

      this.$router.push({
        name: 'edit-project-bpmn',
        params: { id: this.project.id },
        query,
      });
    },
    /**
     * Deploys the project statically using the engineUrl as machine address and starts an instance
     */
    async startProject() {
      if (this.engineUrl) {
        this.startingProject = true;
        const bpmn = await this.$store.getters['processStore/xmlById'](
          this.$router.currentRoute.params.id,
        );
        const elements = await getAllBpmnFlowNodeIds(bpmn);
        const machineMapping = {};
        elements.forEach((el) => {
          machineMapping[el] = {
            machineAddress: this.engineUrl,
          };
        });
        const deployProcessXml = await setDeploymentMethod(
          await setMachineInfo(bpmn, machineMapping),
          'static',
        );
        await this.$store.dispatch('processStore/updateWholeXml', {
          id: this.project.id,
          bpmn: deployProcessXml,
        });

        if (!this.project.shared) {
          this.popupData.body = 'Sending Project to Server to enable execution...';
          this.popupData.color = 'primary';
          this.popupData.display = 'block';

          await this.$store.dispatch('processStore/update', {
            id: this.project.id,
            changes: { shared: true },
          });
        }

        try {
          const version = await createNewProcessVersion(this.$store, deployProcessXml, '', '');
          await engineNetworkInterface.deployProcessVersion(this.project.id, version, false);
          try {
            await engineNetworkInterface.startInstance(this.project.id, version);
            this.popupData.body = 'Project started successfully';
            this.popupData.color = 'success';
          } catch (err2) {
            this.popupData.body = `Failed to start process instance: ${err2.message}`;
            this.popupData.color = 'error';
          }
        } catch (err) {
          this.popupData.body = `Failed to deploy process: ${err.message}`;
          this.popupData.color = 'error';
        }
        this.startingProject = false;
        this.popupData.display = 'block';
        setTimeout(() => {
          this.popupData.display = 'none';
        }, 5000);
      }
    },
    /**
     * Restarts the stopped project execution
     */
    async restartProject() {
      this.showRestartDialog = false;
      try {
        // remove the deployment and redeploy to get a completely clean project state
        await this.deleteDeployment();
        await this.startProject();
        this.popupData.body = 'Project restarted successfully';
        this.popupData.color = 'success';
      } catch (err) {
        this.popupData.body = `Error restarting the project: ${err.message}`;
        this.popupData.color = 'error';
      }
      this.popupData.display = 'block';
      setTimeout(() => {
        this.popupData.display = 'none';
      }, 5000);
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
    async deleteDeployment() {
      await engineNetworkInterface.removeDeployment(this.project.id);
      clearInterval(this.pollingInterval);
      this.showDeleteDeploymentDialog = false;
    },
  },
  async beforeMount() {
    const routerProcessDefinitionsId = this.$router.currentRoute.params.id;
    const bpmn = await this.$store.getters['processStore/xmlById'](routerProcessDefinitionsId);
    this.deployment = {
      definitionId: routerProcessDefinitionsId,
      versions: [{ version: +new Date(), bpmn }],
    };
  },
  created() {
    if (this.$store.getters['warningStore/showWarning'] == true) {
      this.inactivityWarningData.display = 'block';
      this.$store.commit('warningStore/setWarning', false);
    }
  },
  mounted() {
    if (this.storedDeploymentInstanceInfo) {
      this.$store.dispatch('deploymentStore/subscribeForInstanceUpdates', {
        definitionId: this.storedDeployment.definitionId,
        instanceId: this.storedDeploymentInstanceInfo.processInstanceId,
      });
    }
    this.$store.dispatch('deploymentStore/subscribeForDeploymentUpdates');
  },
  beforeRouteLeave(to, from, next) {
    clearInterval(this.pollingInterval);
    this.$store.dispatch('deploymentStore/unsubscribeFromDeploymentUpdates');

    if (this.storedInstance) {
      this.$store.dispatch(
        'deploymentStore/unsubscribeFromInstanceUpdates',
        this.storedInstance.processInstanceId,
      );
    }

    next();
  },
  beforeDestroy() {
    clearInterval(this.pollingInterval);
  },
};
</script>

<style lang="scss" scoped>
.action-toolbar-slot .v-btn {
  width: 100px;
  margin: 0px 5px;
}

.action-toolbar-slot .v-divider {
  border: 1px solid rgb(224, 222, 222);
  margin: -5px 20px;
}
.editor-explorer {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  border-bottom: 1px solid black;
}
.v-divider--vertical.v-divider--inset {
  margin-left: 8px;
  margin-right: 8px;
}
</style>
