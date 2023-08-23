<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>Executions</v-toolbar-title>
      <v-spacer></v-spacer>

      <span class="mx-3">Running Instances: {{ runningInstances.length }}</span>
      <v-btn color="primary" @click="showDeployModal = true" :loading="isCurrentlyDeploying"
        >Deploy Process</v-btn
      >
    </v-toolbar>
    <popup :popupData="popupData" />
    <v-dialog
      eager
      max-width="85vw"
      v-model="updateElementMachineMapping"
      @keydown.esc="updateElementMachineMapping = false"
    >
      <MachineMappingModeler
        style="height: 85vh"
        :show="updateElementMachineMapping"
        :xml="deployProcessXml"
        @saveMachineMapping="saveMachineMapping($event)"
        @cancel="updateElementMachineMapping = false"
        @deploy="deployProcessToMachines(processToDeploy, false)"
      />
    </v-dialog>
    <v-container fluid>
      <v-row justify="center" id="wrapper">
        <v-col class="text-center centered">
          <DeploymentDatatable
            :deployments="sortedDeployments.local"
            @openModal="navigateToDeployment"
          >
            <div>
              <v-row><span class="mx-3">Known Processes</span></v-row>
              <v-row
                ><span class="text-caption font-weight-light mx-3"
                  >Deployments with processes known to the Management System</span
                ></v-row
              >
            </div>
          </DeploymentDatatable>
        </v-col>
      </v-row>
    </v-container>
    <v-container
      fluid
      v-if="Array.isArray(sortedDeployments.external) && sortedDeployments.external.length"
    >
      <v-row justify="center" id="wrapper">
        <v-col class="text-center centered">
          <DeploymentDatatable
            :deployments="sortedDeployments.external"
            is-external
            @click:import="importProcess($event)"
            @openModal="navigateToDeployment"
          >
            <div>
              <v-row><span class="mx-3">Discovered Processes</span></v-row>
              <v-row
                ><span class="text-caption font-weight-light mx-3"
                  >Deployments with processes unknown to the Management System</span
                ></v-row
              >
            </div>
          </DeploymentDatatable>
        </v-col>
      </v-row>
    </v-container>
    <ProcessModal
      isDeploymentMode
      callToActionText="Deploy Process"
      :show="showDeployModal"
      maxWidth="1200px"
      @cancel="showDeployModal = false"
      @staticDeployment="openMappingEditor($event)"
      @dynamicDeployment="deployProcessToMachines($event, true)"
    ></ProcessModal>
    <version-creation-modal
      :show="showVersionCreation"
      :xml="deployProcessXml"
      @close="showVersionCreation = false"
      @done="deployProcessVersion(processToDeploy, $event, isDynamicDeployment)"
    />
  </div>
</template>
<script>
import { engineNetworkInterface, processInterface } from '@/frontend/backend-api/index.js';
import {
  setMachineInfo,
  setDeploymentMethod,
  getDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';
import DeploymentDatatable from '@/frontend/components/deployments/DeploymentDatatable.vue';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import MachineMappingModeler from '@/frontend/components/deployments/MachineMappingModeler.vue';
import ProcessModal from '@/frontend/components/processes/editor/ProcessModal.vue';

import { processHeadDiffersFromBasedOn } from '@/frontend/components/universal/ProcessVersioning/helpers.js';
import VersionCreationModal from '@/frontend/components/universal/ProcessVersioning/ProcessVersionModal.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:Deployments
 */
export default {
  components: {
    DeploymentDatatable,
    MachineMappingModeler,
    popup: AlertWindow,
    ProcessModal,
    VersionCreationModal,
  },
  data() {
    return {
      /** */
      deployDefinitionId: '',
      popupData: {
        body: '',
        display: 'none',
        color: '',
      },
      /** */
      updateElementMachineMapping: false,
      /** */
      deployProcessXml: '',
      /** */
      processToDeploy: null,
      /** */
      showDeployModal: false,
      /** */
      isCurrentlyDeploying: false,

      showVersionCreation: false,
      isDynamicDeployment: false,
    };
  },
  computed: {
    deployedProcesses() {
      const deployedProcesses = Object.values(
        this.$store.getters['deploymentStore/deployments'],
      ).map((deployedProcess) => {
        const deployedProcessInformation = { ...deployedProcess };

        deployedProcessInformation.runningInstances = Object.keys(deployedProcess.runningInstances);

        deployedProcessInformation.endedInstances = Object.keys(deployedProcess.instances).filter(
          (instance) => !deployedProcessInformation.runningInstances.includes(instance),
        );

        return deployedProcessInformation;
      });

      return deployedProcesses;
    },
    processes() {
      const processes = this.$store.getters['processStore/processes'];
      /**
       * Adding additional meta information to current fetched processes
       * Key 1 : totalDeployments
       * Key 2 : totalInstances
       */
      return processes.map((process) => {
        const specificDeployedProcesses = this.deployedProcesses.filter(
          (deployment) => deployment.definitionId === process.id,
        );
        process.totalDeployments = specificDeployedProcesses.length;
        process.totalInstances = 0;
        for (const deployment of specificDeployedProcesses) {
          process.totalInstances += deployment.runningInstances.length;
          process.totalInstances += deployment.endedInstances.length;
        }

        return process;
      });
    },
    /**
     * Sort deployments into two lists: one for local process deployments and one for external deployments
     *
     * @returns {object} - object containing local and external member for deployments
     */
    sortedDeployments() {
      const sortedDeployments = { local: [], external: [] };

      for (const deployment of this.deployedProcesses) {
        const storedDeployedProcess = this.processes.find(
          (process) => process.id === deployment.definitionId,
        );
        if (storedDeployedProcess) {
          sortedDeployments.local.push({ ...deployment, type: storedDeployedProcess.type });
        } else {
          sortedDeployments.external.push(deployment);
        }
      }
      return sortedDeployments;
    },

    runningInstances() {
      let runningInstances = [];

      for (const deployment of this.deployedProcesses) {
        runningInstances = runningInstances.concat(deployment.runningInstances);
      }

      return runningInstances;
    },
  },
  methods: {
    /**
     * Deploys the given process
     *
     * @param {string} processToDeploy - process to be deployed as xml
     */
    deployProcess(processToDeploy) {
      this.processToDeploy = processToDeploy;
      this.deployDefinitionId = processToDeploy.id;
      this.showDeployModal = false;
    },
    /** */
    async navigateToDeployment(deployment) {
      const processIsLocal = !!this.sortedDeployments.local.find(
        (localDeployment) => localDeployment.definitionId === deployment.definitionId,
      );

      if (!processIsLocal) {
        await this.importProcess(deployment);
      }

      if (deployment.type === 'project') {
        this.$router.push({ name: 'show-project-bpmn', params: { id: deployment.definitionId } });
      } else {
        this.$router.push({
          name: 'deployment-overview',
          params: { id: deployment.definitionId },
        });
      }
    },
    /** */
    async deployProcessToMachines(processToDeploy, dynamic) {
      this.deployProcess(processToDeploy);
      const currentXml = await this.$store.getters['processStore/xmlById'](processToDeploy.id);
      this.deployProcessXml = await setDeploymentMethod(currentXml, dynamic ? 'dynamic' : 'static');
      await this.$store.dispatch('processStore/updateWholeXml', {
        id: processToDeploy.id,
        bpmn: this.deployProcessXml,
      });

      if (await processHeadDiffersFromBasedOn(this.$store, processToDeploy.id)) {
        this.isDynamicDeployment = dynamic;
        this.showVersionCreation = true;
      } else {
        // get the version that the selected process model is based on
        const { versionBasedOn } = await getDefinitionsVersionInformation(this.deployProcessXml);

        await this.deployProcessVersion(processToDeploy, versionBasedOn, dynamic);
      }
    },

    async deployProcessVersion(processToDeploy, version, dynamic) {
      const versionAlreadyDeployed = this.deployedProcesses.find(
        (process) =>
          process.definitionId == processToDeploy.id &&
          process.versions.some((versionInfo) => versionInfo.version == version),
      );

      if (versionAlreadyDeployed) {
        this.popupData.body = 'This process version was already deployed';
        this.popupData.color = 'warning';
        this.showDeployModal = false;
        this.openPopup();
      } else {
        this.isCurrentlyDeploying = true;

        // check if the process is already stored in the backend (otherwise the backend cannot deploy it)
        if (!processToDeploy.shared) {
          // if not => move it into the backend
          await this.$store.dispatch('processStore/update', {
            id: this.processToDeploy.id,
            changes: { shared: true },
          });
        }

        try {
          await engineNetworkInterface.deployProcessVersion(processToDeploy.id, version, dynamic);
          this.popupData.body = 'Deployed process version successfully';
          this.popupData.color = 'success';
        } catch (err) {
          this.popupData.body = `Failed to deploy process version: ${err.message}.`;
          this.popupData.color = 'error';
        }
        this.openPopup();
        this.isCurrentlyDeploying = false;
      }
      this.updateElementMachineMapping = false;
      this.showVersionCreation = false;
      setTimeout(() => {
        this.popupData.display = 'none';
      }, 7000);
      this.deployDefinitionId = '';
    },

    /**
     * Opens a popup dialog
     */
    openPopup() {
      this.popupData.display = 'block';
    },

    /**
     * Opens dialog that allows editing of machine maching for process with given id
     *
     * @param {string} definitionId id of the process we want to update
     */
    async openMappingEditor(processToDeploy) {
      this.deployProcess(processToDeploy);
      const process = this.processes.find(
        (storedProcess) => storedProcess.id === processToDeploy.id,
      );
      this.deployProcessXml = await setDeploymentMethod(
        await this.$store.getters['processStore/xmlById'](process.id),
        'static',
      );
      this.updateElementMachineMapping = true;
      this.$store.dispatch('processStore/updateWholeXml', {
        id: this.deployDefinitionId,
        bpmn: this.deployProcessXml,
      });
    },
    /**
     * Saves the given machine mapping in the bpmn of the currently selected process
     *
     * @param {object} obj the flowNode to machine mapping
     */
    async saveMachineMapping(obj) {
      if (obj) {
        this.deployProcessXml = await setMachineInfo(this.deployProcessXml, obj);
        this.$store.dispatch('processStore/updateWholeXml', {
          id: this.deployDefinitionId,
          bpmn: this.deployProcessXml,
        });
      }
    },
    /**
     * For saving processes on the MS which are stored on an engine
     */
    async importProcess(deployment) {
      // let the backend import the process from known engines
      await engineNetworkInterface.importProcess(deployment.definitionId);

      // pull the information about the imported process from the backend
      const process = await processInterface.pullProcess(deployment.definitionId);
      const bpmn = process.bpmn;
      delete process.bpmn;
      await this.$store.dispatch('processStore/add', { process, bpmn });
    },
  },
  mounted() {
    this.$store.dispatch('deploymentStore/subscribeForDeploymentUpdates');
  },
  async beforeRouteLeave(to, from, next) {
    this.$store.dispatch('deploymentStore/unsubscribeFromDeploymentUpdates');
    next();
  },
};
</script>
