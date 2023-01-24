<template>
  <token-toolbar
    ref="token-toolbar"
    v-if="modeler && instance"
    :isControlledExternally="tokenEditorResetFlag"
    :instance="instance"
    :tokens="instance.tokens"
    :viewer="modeler"
    :deployment="deployment"
    @addedTokens:changed="addedTokens = $event"
    @movedTokens:changed="movedTokens = $event"
    @removedTokens:changed="removedTokens = $event"
  >
    <template #external-control>
      <tooltip-button :disabled="!instance" @click="updateProcess">
        <template #tooltip-text>Apply Changes</template>
        mdi-send-outline
      </tooltip-button>
      <version-creation-modal
        :xml="newVersionXml"
        :show="showVersionCreationModal"
        @close="showVersionCreationModal = false"
        @done="updateProcessInstance"
      ></version-creation-modal>
    </template>
  </token-toolbar>
</template>
<script>
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

import VersionCreationModal from '@/frontend/components/universal/ProcessVersioning/ProcessVersionModal.vue';
import { convertToEditableBpmn } from '@/shared-frontend-backend/helpers/processVersioning.js';
import { processHeadDiffersFromBasedOn } from '@/frontend/components/universal/ProcessVersioning/helpers.js';

import {
  getAllBpmnFlowNodeIds,
  setMachineInfo,
  setDefinitionsId,
  setTargetNamespace,
} from '@proceed/bpmn-helper';

import { engineNetworkInterface } from '@/frontend/backend-api/index.js';

import TokenToolbar from '@/frontend/components/deployments/Tokens.vue';
import { asyncForEach } from '@/shared-frontend-backend/helpers/javascriptHelpers';

export default {
  components: { TooltipButton, VersionCreationModal, TokenToolbar },
  props: {
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showVersionCreationModal: false,
      newVersionXml: null,
      addedTokens: {},
      movedTokens: {},
      removedTokens: {},
      tokenEditorResetFlag: true,
    };
  },
  computed: {
    originalProcessId() {
      return this.process.id.split('-instance-')[0];
    },
    instanceProcessId() {
      return this.process.id;
    },
    currentProcessXml() {
      return this.$store.getters['processEditorStore/processXml'];
    },
    deployedProcesses() {
      return this.$store.getters['deploymentStore/deployments'];
    },
    deployment() {
      return this.deployedProcesses[this.originalProcessId];
    },
    instance() {
      return this.$store.getters['deploymentStore/instances'][this.process.instanceId];
    },
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
  },
  methods: {
    async updateProcess() {
      // there are token changes but no changes to the bpmn => trigger a token update and return
      if (!(await processHeadDiffersFromBasedOn(this.$store, this.instanceProcessId))) {
        await this.updateInstanceTokens();
        this.$emit('returnToOverview');
        return;
      }

      // there are changes to the underlying bpmn of an instance => create a new version, deploy it and migrate
      const bpmn = await this.$store.getters['processStore/xmlById'](this.instanceProcessId);
      let deployProcessXml = bpmn;

      // if a project is edited => make sure to set the machine mapping of all tasks to the correct machine
      if (this.process.type === 'project') {
        const elements = await getAllBpmnFlowNodeIds(bpmn);
        const machineMapping = {};
        const machineId = this.deployment.machines[0];
        const instanceMachine = this.$store.getters['machineStore/machineById'](machineId);
        elements.forEach((el) => {
          machineMapping[el] = {
            machineAddress: `${instanceMachine.ip}:${instanceMachine.port}`,
          };
        });

        deployProcessXml = await setMachineInfo(bpmn, machineMapping);
      }
      // TODO: force the user to assign machines if this is a statically deployed process

      if (deployProcessXml !== bpmn) {
        // update the bpmn if there are changes due to new machine mappings
        await this.$store.dispatch('processStore/updateWholeXml', {
          id: this.instanceProcessId,
          bpmn: deployProcessXml,
        });
      }

      this.newVersionXml = deployProcessXml;

      this.showVersionCreationModal = true;
    },
    async updateInstanceTokens() {
      const tokenToolbar = this.$refs['token-toolbar'];
      if (tokenToolbar.hasTokenChanges) {
        tokenToolbar.applyTokenChanges();
      }
    },
    async updateProcessInstance(newVersion) {
      this.showVersionCreationModal = false;

      if (newVersion == this.instance.processVersion) {
        console.log('No changes to the previous version detected');
        return;
      }

      const add = Object.values(this.addedTokens).map((token) => ({
        ...token,
        tokenId: undefined,
      }));

      // Make sure that the original process exists in the backend and has the version we want to migrate to
      let shouldDeleteAfterMigration = false;
      if (this.originalProcessId !== this.instanceProcessId) {
        // we are editing the instance of a process in a placeholder process environment => change the information in the bpmn to match the original process
        let { bpmn, userTasks } = await engineNetworkInterface.getFullProcessVersionData(
          this.instanceProcessId,
          newVersion
        );
        // ensure that the old process is not set as the "originalId"
        bpmn = await setDefinitionsId(bpmn, undefined);
        bpmn = await setTargetNamespace(bpmn, undefined);

        if (
          !this.$store.getters['processStore/processes'].some(
            (process) => process.id === this.originalProcessId
          )
        ) {
          shouldDeleteAfterMigration = true;
          // if the original process is not stored in the backend => create a dummy process that will be used when deploying the version
          let { bpmn: unversionedBpmn } = await convertToEditableBpmn(bpmn);
          await this.$store.dispatch('processStore/add', {
            process: {
              id: this.originalProcessId,
              type: 'dummy-process',
              shared: true,
            },
            bpmn: unversionedBpmn,
          });
        }

        // make sure to use the correct process definitions id in the bpmn
        bpmn = await setDefinitionsId(bpmn, this.originalProcessId);
        bpmn = await setTargetNamespace(bpmn, this.originalProcessId);
        // store the new version in the original/dummy process
        await this.$store.dispatch('processStore/addVersion', { id: this.originalProcessId, bpmn });

        // send new user task data to the backend
        await asyncForEach(Object.keys(userTasks), async (taskFileName) => {
          await this.$store.dispatch('processStore/saveUserTask', {
            processDefinitionsId: this.originalProcessId,
            taskFileName,
            html: userTasks[taskFileName],
          });
        });

        // TODO: send other data like images and imports
      }

      await engineNetworkInterface.migrateInstances(
        this.originalProcessId,
        this.instance.processVersion,
        newVersion,
        [this.instance.processInstanceId],
        {
          tokenMapping: {
            add,
            move: Object.values(this.movedTokens),
            remove: Object.values(this.removedTokens).map(({ tokenId }) => tokenId),
          },
        }
      );

      // Remove the process if it was not stored locally before and only added as a dummy for migration
      if (shouldDeleteAfterMigration) {
        await this.$store.dispatch('processStore/remove', { id: this.originalProcessId });
      }

      this.modeler.get('customModeling').setBasedOnVersion(newVersion, true);

      this.tokenEditorResetFlag = false;

      this.$nextTick(() => {
        this.tokenEditorResetFlag = true;
        this.$emit('returnToOverview');
      });
    },
  },
  mounted() {
    this.$store.dispatch('deploymentStore/subscribeForDeploymentUpdates');
    this.$store.dispatch('deploymentStore/subscribeForInstanceUpdates', {
      definitionId: this.originalProcessId,
      instanceId: this.process.instanceId,
    });
  },
  async beforeDestroy() {
    await this.$store.dispatch(
      'deploymentStore/unsubscribeFromInstanceUpdates',
      this.process.instanceId
    );
    await this.$store.dispatch('deploymentStore/unsubscribeFromDeploymentUpdates');
  },
};
</script>
