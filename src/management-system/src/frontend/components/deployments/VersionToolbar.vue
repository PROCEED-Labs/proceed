<template>
  <toolbar-group>
    <popup :popupData="popupData" />
    <toolbar-menu
      :selectedItem="selectedVersion"
      @selectionChange="$emit('selectionChange', $event)"
      :items="selectableVersions"
      itemTextattribute="versionName"
      itemHintAttribute="versionDescription"
      :noSelectionText="shownVersionWhenNoneSelected.versionName"
      :mandatorySelection="!!selectedVersion"
    >
      <template #open-hint>Filter instances according to a specific version</template>
      <template #list-prepend>
        <v-list-item
          :input-value="!selectedVersion"
          style="color: darkgray; font-style: italic"
          @click="$emit('selectionChange', null)"
          >(Unselect Version)</v-list-item
        >
      </template>
    </toolbar-menu>
    <tooltip-button color="primary" :loading="isStartingInstance" @click.stop="startInstance">
      <template #tooltip-text>Start New Instance With Current Version</template>
      mdi-plus-circle-outline
    </tooltip-button>
    <migration-modal
      v-if="canMigrate || showMigrationModal"
      :show="showMigrationModal"
      :deployment="deployment"
      :sourceVersion="selectedVersion"
      :versions="migratableVersions"
      :selectableInstances="selectableInstances"
      @close="showMigrationModal = false"
      @done="$emit('selectionChange', $event)"
    />
    <tooltip-button :disabled="!canMigrate" @click.stop="showMigrationModal = true">
      <template #tooltip-text>Migrate Instances</template>
      mdi-swap-vertical-circle-outline
    </tooltip-button>
  </toolbar-group>
</template>
<script>
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import ToolbarGroup from '@/frontend/components/universal/toolbar/ToolbarGroup.vue';
import ToolbarMenu from '@/frontend/components/universal/toolbar/ToolbarMenu.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';
import MigrationModal from '@/frontend/components/deployments/InstanceMigrationModal.vue';

import { engineNetworkInterface } from '@/frontend/backend-api/index.js';

export default {
  components: { ToolbarGroup, ToolbarMenu, TooltipButton, MigrationModal, popup: AlertWindow },
  props: {
    deployment: {
      type: Object,
      required: true,
    },
    selectableVersions: {
      type: Array,
      required: true,
    },
    selectedVersion: {
      type: Object,
    },
    selectableInstances: {
      type: Array,
      default: () => [],
    },
    selectedInstance: {
      type: Object,
    },
  },
  data() {
    return {
      isStartingInstance: false,
      showMigrationModal: false,

      popupData: {
        body: '',
        display: 'none',
        color: '',
      },
    };
  },
  computed: {
    processes() {
      return this.$store.getters['processStore/processes'];
    },
    localProcess() {
      return this.processes.find((process) => process.id === this.deployment.definitionId);
    },
    localVersions() {
      if (this.localProcess) {
        return this.localProcess.versions.map(({ version, name, description }) => ({
          version,
          versionName: name,
          versionDescription: description,
          isLocal: true,
        }));
      }

      return [];
    },
    migratableVersions() {
      if (!this.selectedVersion) {
        return undefined;
      }

      const filteredLocalVersions = this.localVersions.filter(
        ({ version: localVersion }) =>
          !this.selectableVersions.some(
            ({ version: selectableVersion }) => selectableVersion === localVersion
          )
      );

      return this.selectableVersions
        .concat(filteredLocalVersions)
        .filter(({ version }) => version !== this.selectedVersion.version);
    },
    canMigrate() {
      return this.migratableVersions && this.selectableInstances.length;
    },
    // this will be used when no version is selected but some is shown in context of an instance/deployment
    shownVersionWhenNoneSelected() {
      if (this.selectedInstance) {
        const versionId = this.selectedInstance.processVersion;
        return this.selectableVersions.find(({ version }) => version == versionId);
      }

      // show the latest version if no instance is selected
      return this.deployment.versions.concat().sort((a, b) => b.version - a.version)[0];
    },
  },
  methods: {
    /**
     * Start a new instance of the deployed process using the currently selected id
     */
    async startInstance() {
      this.isStartingInstance = true;
      try {
        let version;

        if (this.selectedVersion) {
          ({ version } = this.selectedVersion);
        } else {
          ({ version } = this.shownVersionWhenNoneSelected);
        }

        const instanceId = await engineNetworkInterface.startInstance(
          this.deployment.definitionId,
          version
        );

        this.popupData.body = 'Executing process instance';
        this.popupData.color = 'success';
        setTimeout(() => {
          this.popupData.display = 'none';
        }, 5000);
        this.$emit('newInstance', instanceId);
      } catch (err) {
        this.popupData.body = 'Error starting the process instance';
        this.popupData.color = 'error';
        console.error(err);
      }
      this.isStartingInstance = false;
      this.popupData.display = 'block';
    },
  },
};
</script>
